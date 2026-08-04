"""Persistent retrieval-augmented context for JobPilot AI chat."""

import hashlib
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol, Sequence

from config import Settings
from database import db
from models.job_listing import JobListing
from models.resume import Resume
from resume.parser import extract_text_from_pdf

logger = logging.getLogger(__name__)
COLLECTION_NAME = "jobpilot_knowledge"
CHUNK_SIZE = 900
CHUNK_OVERLAP = 150


class Embedder(Protocol):
    """Injectable contract for turning text into vector embeddings."""

    def encode(self, texts: Sequence[str]) -> list[list[float]]: ...


class VectorCollection(Protocol):
    """Injectable contract used by the RAG service for vector persistence."""

    def upsert(self, *, ids: list[str], documents: list[str], metadatas: list[dict], embeddings: list[list[float]]) -> None: ...

    def query(self, *, query_embeddings: list[list[float]], n_results: int, where: dict) -> dict: ...


class SentenceTransformerEmbedder:
    """sentence-transformers adapter, loaded only when RAG is used."""

    def __init__(self, model_name: str) -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as error:
            raise RuntimeError("RAG dependencies are not installed. Install chromadb and sentence-transformers.") from error
        self._model = SentenceTransformer(model_name)

    def encode(self, texts: Sequence[str]) -> list[list[float]]:
        return self._model.encode(list(texts), normalize_embeddings=True).tolist()


class ChromaCollection:
    """ChromaDB adapter that keeps Chroma imports and setup out of application services."""

    def __init__(self, directory: Path, collection_name: str) -> None:
        try:
            import chromadb
        except ImportError as error:
            raise RuntimeError("RAG dependencies are not installed. Install chromadb and sentence-transformers.") from error
        directory.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=str(directory))
        self._collection = client.get_or_create_collection(name=collection_name)

    def upsert(self, **kwargs) -> None:
        self._collection.upsert(**kwargs)

    def query(self, **kwargs) -> dict:
        return self._collection.query(**kwargs)


@dataclass(frozen=True)
class RetrievedContext:
    """One cited RAG chunk returned to the chat layer."""

    content: str
    source_type: str
    source_name: str
    source_id: str
    distance: float | None

    def to_source(self) -> dict:
        return {
            "type": self.source_type,
            "name": self.source_name,
            "id": self.source_id,
            "excerpt": self.content[:320],
        }


class RAGService:
    """Indexes JobPilot knowledge and retrieves user-safe relevant chunks."""

    def __init__(self, collection: VectorCollection, embedder: Embedder) -> None:
        self._collection = collection
        self._embedder = embedder

    @staticmethod
    def _chunk(text: str) -> list[str]:
        normalized = " ".join(text.split())
        if not normalized:
            return []
        return [normalized[start:start + CHUNK_SIZE] for start in range(0, len(normalized), CHUNK_SIZE - CHUNK_OVERLAP)]

    @staticmethod
    def _document_id(source_type: str, source_id: str, index: int, chunk: str) -> str:
        digest = hashlib.sha256(chunk.encode("utf-8")).hexdigest()[:16]
        return f"{source_type}:{source_id}:{index}:{digest}"

    def _index(self, *, source_type: str, source_id: str, source_name: str, user_id: str | None, text: str) -> None:
        chunks = self._chunk(text)
        if not chunks:
            return
        metadata = {
            "source_type": source_type,
            "source_id": source_id,
            "source_name": source_name[:250],
            "user_id": user_id or "",
        }
        self._collection.upsert(
            ids=[self._document_id(source_type, source_id, index, chunk) for index, chunk in enumerate(chunks)],
            documents=chunks,
            metadatas=[{**metadata, "chunk_index": index} for index in range(len(chunks))],
            embeddings=self._embedder.encode(chunks),
        )

    def index_resume(self, resume: Resume) -> None:
        """Index both the source PDF text and its completed AI intelligence."""
        pdf_path = Path(Settings.UPLOAD_FOLDER) / resume.stored_filename
        if pdf_path.is_file():
            self._index(source_type="resume", source_id=resume.id, source_name=resume.original_filename, user_id=resume.user_id, text=extract_text_from_pdf(str(pdf_path)))
        if resume.intelligence and resume.intelligence.status == "complete":
            self._index(source_type="resume_intelligence", source_id=resume.id, source_name="Resume Intelligence", user_id=resume.user_id, text=json.dumps(resume.intelligence.to_dict(), ensure_ascii=False))

    def index_jobs(self, jobs: Sequence[JobListing]) -> None:
        """Index cached job descriptions as shared, non-user-specific knowledge."""
        for job in jobs:
            self._index(source_type="job_description", source_id=job.id, source_name=f"{job.title} at {job.company}", user_id=None, text=json.dumps(job.to_match_dict(), ensure_ascii=False))

    def index_match(self, *, resume: Resume, job: JobListing, match: dict) -> None:
        """Index a generated match report under its resume owner's access scope."""
        self._index(source_type="match_analysis", source_id=f"{resume.id}:{job.id}", source_name=f"Match: {job.title} at {job.company}", user_id=resume.user_id, text=json.dumps(match, ensure_ascii=False))

    def retrieve_context(self, question: str, user_id: str, limit: int = 6) -> list[RetrievedContext]:
        """Return the closest user-safe resume/match chunks and shared job chunks."""
        embedding = self._embedder.encode([question])
        results: list[RetrievedContext] = []
        for where in ({"user_id": user_id}, {"source_type": "job_description"}):
            response = self._collection.query(query_embeddings=embedding, n_results=limit, where=where)
            documents = (response.get("documents") or [[]])[0]
            metadatas = (response.get("metadatas") or [[]])[0]
            distances = (response.get("distances") or [[]])[0]
            for index, content in enumerate(documents):
                metadata = metadatas[index]
                results.append(RetrievedContext(content=content, source_type=metadata["source_type"], source_name=metadata["source_name"], source_id=metadata["source_id"], distance=distances[index] if index < len(distances) else None))
        results.sort(key=lambda item: item.distance if item.distance is not None else float("inf"))
        return results[:limit]


_rag_service: RAGService | None = None


def get_rag_service() -> RAGService:
    """Create the process-local service once while retaining injectable adapters for tests."""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService(ChromaCollection(Settings.CHROMA_PERSIST_DIRECTORY, COLLECTION_NAME), SentenceTransformerEmbedder(Settings.EMBEDDING_MODEL))
    return _rag_service


def index_resume(resume: Resume) -> None:
    get_rag_service().index_resume(resume)


def index_jobs(jobs: Sequence[JobListing]) -> None:
    get_rag_service().index_jobs(jobs)


def index_match(resume: Resume, job: JobListing, match: dict) -> None:
    get_rag_service().index_match(resume=resume, job=job, match=match)


def retrieve_context(question: str, user_id: str) -> list[RetrievedContext]:
    return get_rag_service().retrieve_context(question, user_id)


def ensure_user_indexed(user_id: str) -> None:
    """Backfill persisted resume and cached job records for an existing user on demand."""
    service = get_rag_service()
    for resume in db.session.execute(db.select(Resume).where(Resume.user_id == user_id)).scalars():
        try:
            service.index_resume(resume)
        except Exception:
            logger.warning("Unable to index resume_id=%s for RAG", resume.id, exc_info=True)
    service.index_jobs(db.session.execute(db.select(JobListing)).scalars().all())
