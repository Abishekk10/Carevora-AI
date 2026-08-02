import { AlertCircle, CheckCircle2, FileUp, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";

import { resumesApi } from "../api/client";
import ResumeCard from "../components/resume/ResumeCard";
import ResumeIntelligenceCard from "../components/resume/ResumeIntelligenceCard";
import { useUser } from "../context/UserContext";

const RESUME_KEY = "jobpilot-current-resume";

export default function ResumeUpload() {
  const { user } = useUser();
  const inputRef = useRef(null);
  const [resume, setResume] = useState(() => { const item = localStorage.getItem(RESUME_KEY); return item ? JSON.parse(item) : null; });
  const [isDragging, setDragging] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const saveResume = (nextResume) => { setResume(nextResume); if (nextResume) localStorage.setItem(RESUME_KEY, JSON.stringify(nextResume)); else localStorage.removeItem(RESUME_KEY); };
  const upload = async (file) => {
    if (!file || isUploading) return;
    if (!user) { setError("Create your profile before uploading a resume."); return; }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { setError("Please choose a PDF resume."); return; }
    setError(""); setSuccess(""); setProgress(0); setUploading(true);
    try {
      const uploadedResume = await resumesApi.upload(user.id, file, (event) => {
        if (event.total) setProgress(Math.round((event.loaded * 100) / event.total));
      });
      saveResume(uploadedResume);
      setProgress(100);
      setSuccess(uploadedResume.intelligence?.status === "failed" ? "Resume uploaded, but AI analysis could not be completed." : "Resume uploaded and analyzed successfully.");
    } catch (requestError) { setError(requestError.message); } finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  };
  const remove = async () => { if (!resume || !window.confirm("Delete this resume?")) return; setDeleting(true); setError(""); try { await resumesApi.remove(resume.id); saveResume(null); setSuccess("Resume deleted."); } catch (requestError) { setError(requestError.message); } finally { setDeleting(false); } };

  return <section className="animate-fade-up"><h1 className="page-title">Resume intelligence</h1><p className="page-subtitle">Upload a PDF resume to build a structured, AI-ready career profile.</p>{!user && <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><span>Set up a profile before uploading so your resume stays connected to your JobPilot account. <Link to="/profile" className="font-semibold underline">Create profile</Link></span></div>}{error && <div role="alert" className="mt-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}{success && <div role="status" className="mt-6 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 className="h-5 w-5 shrink-0" />{success}</div>}
    <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); upload(event.dataTransfer.files[0]); }} className={`mt-7 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30"}`} onClick={() => !isUploading && inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && !isUploading && inputRef.current?.click()}><input ref={inputRef} className="hidden" type="file" accept="application/pdf,.pdf" onClick={(event) => event.stopPropagation()} onChange={(event) => upload(event.target.files?.[0])} /><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-100 text-indigo-600"><UploadCloud className="h-7 w-7" /></span><h2 className="mt-5 font-semibold text-slate-900">{isUploading ? "Uploading and analyzing your resume…" : "Drop your resume here"}</h2><p className="mt-2 text-sm text-slate-500">or click to browse. PDF files up to 10 MB.</p>{isUploading && <div className="mx-auto mt-5 max-w-sm"><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs font-medium text-slate-500">{progress}% uploaded</p></div>}<span className="btn-primary mt-5 pointer-events-none"><FileUp className="h-4 w-4" />Choose PDF</span></div>
    {resume && <div className="mt-8 space-y-5"><div><h2 className="text-lg font-bold text-slate-900">Current resume</h2><div className="mt-3"><ResumeCard resume={resume} onDelete={remove} deleting={isDeleting} /></div>{resume.intelligence?.status === "failed" && <p className="mt-3 text-sm text-amber-700">AI analysis failed: {resume.intelligence.error_message || "Please try uploading again later."}</p>}</div><ResumeIntelligenceCard intelligence={resume.intelligence} /></div>}</section>;
}
