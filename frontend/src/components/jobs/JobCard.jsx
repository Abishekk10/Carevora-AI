import { Banknote, Building2, ExternalLink, MapPin, Plus, Sparkles } from "lucide-react";

const formatSalary = (job) => {
  if (!job.salary_min && !job.salary_max) return "Salary not listed";
  const formatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
  return `${job.currency || "INR"} ${formatter.format(job.salary_min || 0)}${job.salary_max ? ` – ${formatter.format(job.salary_max)}` : "+"}`;
};

export default function JobCard({ job, onMatchResume, onAddToApplications }) {
  return (
    <article className="surface group p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-18px_rgba(99,102,241,0.7)]">
      <div className="flex gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-sm font-bold text-violet-200 ring-1 ring-white/10">
          {job.company?.slice(0, 1)?.toUpperCase() || "J"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white">{job.title}</h3>
              <p className="mt-0.5 text-sm text-slate-300">{job.company}</p>
            </div>
            <span className="rounded-full border border-white/10 bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-200">{job.source}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
            <span className="inline-flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" />{formatSalary(job)}</span>
            {job.category && <span className="inline-flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{job.category}</span>}
          </div>
          <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-300">{job.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a href={job.apply_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300 hover:text-indigo-200">View role <ExternalLink className="h-4 w-4" /></a>
            <button type="button" onClick={() => onMatchResume?.(job)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-300 hover:text-violet-200"><Sparkles className="h-4 w-4" />Match resume</button>
            <button type="button" onClick={() => onAddToApplications?.(job)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 hover:text-emerald-200"><Plus className="h-4 w-4" />Add to Applications</button>
          </div>
        </div>
      </div>
    </article>
  );
}
