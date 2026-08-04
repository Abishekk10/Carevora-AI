import { Download, FileText, Trash2 } from "lucide-react";

export default function ResumeCard({ resume, onDelete, deleting = false }) {
  const uploadedDate = resume.created_at ? new Date(resume.created_at).toLocaleDateString() : "Just now";
  const size = resume.size_bytes ? `${Math.max(1, Math.round(resume.size_bytes / 1024))} KB` : "PDF";

  return (
    <article className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-rose-500/15 text-rose-300">
        <FileText className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-white">{resume.original_filename}</h3>
        <p className="mt-1 text-sm text-slate-300">{size} · Uploaded {uploadedDate}</p>
      </div>
      <div className="flex gap-2">
        <a className="btn-secondary px-3" href={resume.download_url || `/api/resumes/${resume.id}/download`} title="Download">
          <Download className="h-4 w-4" />
        </a>
        <button className="btn-secondary px-3 text-rose-200 hover:bg-rose-500/10" onClick={onDelete} disabled={deleting} title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
