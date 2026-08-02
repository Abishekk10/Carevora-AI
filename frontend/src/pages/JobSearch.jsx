import { AlertCircle, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { jobsApi } from "../api/client";
import JobCard from "../components/jobs/JobCard";
import ResumeMatchModal from "../components/jobs/ResumeMatchModal";
import Loader from "../components/common/Loader";

export default function JobSearch() {
  const [form, setForm] = useState({ query: "", location: "", results_per_page: 20 });
  const [jobs, setJobs] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [matchState, setMatchState] = useState(null);

  const submitSearch = async (event) => {
    event.preventDefault();
    if (!form.query.trim()) return;
    setLoading(true); setError("");
    try { const response = await jobsApi.search({ ...form, query: form.query.trim(), location: form.location.trim() }); setJobs(response.jobs); setHasSearched(true); }
    catch (requestError) { setError(requestError.message); setJobs([]); setHasSearched(true); }
    finally { setLoading(false); }
  };

  const matchResume = async (job) => {
    const storedResume = localStorage.getItem("jobpilot-current-resume");
    const resume = storedResume ? JSON.parse(storedResume) : null;
    if (!resume?.id) { setMatchState({ job, error: "Upload and analyze a resume before requesting a job match." }); return; }
    if (resume.intelligence?.status !== "complete") { setMatchState({ job, error: "Your resume analysis is not ready yet. Upload a resume with completed AI analysis first." }); return; }
    setMatchState({ job, isLoading: true });
    try { const match = await jobsApi.match(resume.id, job.id); setMatchState({ job, match }); }
    catch (requestError) { setMatchState({ job, error: requestError.message }); }
  };

  return <section className="animate-fade-up"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="page-title">Job search</h1><p className="page-subtitle">Search live opportunities from JobPilot’s provider network.</p></div>{hasSearched && !isLoading && <p className="text-sm font-medium text-slate-500">{jobs.length} opportunities found</p>}</div>
    <form onSubmit={submitSearch} className="surface mt-7 p-4 sm:p-5"><div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_140px_auto]"><label className="relative"><Search className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-slate-400" /><input className="field pl-11" value={form.query} onChange={(event) => setForm({ ...form, query: event.target.value })} placeholder="Job title, skill, or keyword" aria-label="Job keywords" /></label><label className="relative"><MapPin className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-slate-400" /><input className="field pl-11" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Location (optional)" aria-label="Location" /></label><label className="relative"><SlidersHorizontal className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" /><select className="field pl-9" value={form.results_per_page} onChange={(event) => setForm({ ...form, results_per_page: Number(event.target.value) })} aria-label="Results per page"><option value={10}>10 results</option><option value={20}>20 results</option><option value={50}>50 results</option></select></label><button className="btn-primary" disabled={isLoading || !form.query.trim()}>{isLoading ? "Searching" : "Search jobs"}<Search className="h-4 w-4" /></button></div></form>
    {error && <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />{error}</div>}
    {isLoading ? <Loader label="Searching live job listings" /> : <div className="mt-6 space-y-4">{jobs.map((job) => <JobCard key={`${job.source}-${job.id}`} job={job} onMatchResume={matchResume} />)}{hasSearched && !error && jobs.length === 0 && <div className="surface py-16 text-center"><Search className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-4 font-semibold text-slate-800">No roles matched this search</h2><p className="mt-1 text-sm text-slate-500">Try a broader job title or a different location.</p></div>}{!hasSearched && <div className="surface mt-6 py-16 text-center"><Search className="mx-auto h-9 w-9 text-indigo-300" /><h2 className="mt-4 font-semibold text-slate-800">Start with a focused search</h2><p className="mt-1 text-sm text-slate-500">Use a role, skill, or company name to discover current openings.</p></div>}</div>}{matchState && <ResumeMatchModal {...matchState} onClose={() => setMatchState(null)} />}</section>;
}
