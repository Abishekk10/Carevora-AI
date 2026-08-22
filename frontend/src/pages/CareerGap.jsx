import { AlertCircle, CheckCircle2, Gauge, GraduationCap, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { careerGapApi } from "../api/client";
import Loader from "../components/common/Loader";

const PRESET_ROLES = [
  "Software Engineer",
  "Data Scientist",
  "Data Analyst",
  "Backend Developer",
  "Frontend Developer",
  "ML Engineer",
];

function StatusBadge({ status }) {
  if (status === "Strong") {
    return (
      <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
        Strong
      </span>
    );
  }
  if (status === "Weak") {
    return (
      <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
        Weak
      </span>
    );
  }
  return (
    <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-300">
      Missing
    </span>
  );
}

export default function CareerGap() {
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [customRole, setCustomRole] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const roleToAnalyze = customRole.trim() || targetRole;

  const analyze = async (event) => {
    event.preventDefault();
    if (!roleToAnalyze) return;
    setLoading(true);
    setError("");
    try {
      const data = await careerGapApi.analyze({ target_role: roleToAnalyze });
      setResult(data);
    } catch (requestError) {
      setError(requestError.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const zeroJobs = result && result.jobs_analyzed === 0;
  const showPercents = result && result.jobs_analyzed >= 5;

  return (
    <section className="animate-fade-up">
      <div>
        <h1 className="page-title">Career Intelligence</h1>
        <p className="page-subtitle">
          Compare your parsed resume against Carevora&apos;s cached jobs for a target role. Demand
          percentages come only from those listings — not invented market stats.
        </p>
      </div>

      <form onSubmit={analyze} className="surface mt-7 space-y-5 p-4 sm:p-6">
        <div>
          <label className="text-sm font-semibold text-slate-200">Target role</label>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {PRESET_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setTargetRole(role);
                  setCustomRole("");
                }}
                className={`rounded-2xl border p-3 text-left text-sm font-semibold transition ${
                  !customRole.trim() && targetRole === role
                    ? "border-violet-500 bg-violet-600/15 text-white"
                    : "border-white/10 bg-slate-950/40 text-slate-300 hover:bg-slate-950/80"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-200">Or enter another role</span>
          <input
            className="field"
            value={customRole}
            onChange={(event) => setCustomRole(event.target.value)}
            placeholder="e.g. Cloud Engineer"
            maxLength={120}
            aria-label="Custom target role"
          />
        </label>
        <button className="btn-primary" disabled={isLoading || !roleToAnalyze}>
          {isLoading ? "Analyzing…" : (
            <>
              <Sparkles className="h-4 w-4" />
              Analyze skill gaps
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p>{error}</p>
            {error.toLowerCase().includes("resume") && (
              <Link to="/resume" className="mt-2 inline-block text-xs font-semibold text-rose-200 underline">
                Go to Resume Intelligence
              </Link>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <Loader label="Analyzing cached jobs for this role" />
      ) : result ? (
        <div className="mt-6 space-y-6">
          <div className="surface flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target role</p>
              <p className="mt-1 text-lg font-bold text-white">{result.target_role}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-200">
              <Gauge className="h-4 w-4 text-indigo-300" />
              {result.jobs_analyzed} cached job{result.jobs_analyzed === 1 ? "" : "s"} analyzed
            </div>
          </div>

          {result.notice && (
            <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
              !showPercents
                ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
                : "border-white/10 bg-slate-900/60 text-slate-300"
            }`}
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p>{result.notice}</p>
                {!showPercents && (
                  <Link to="/jobs" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-200 underline">
                    <Search className="h-3.5 w-3.5" />
                    Search jobs for this role
                  </Link>
                )}
              </div>
            </div>
          )}

          {!zeroJobs && (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="surface p-5">
                  <h2 className="flex items-center gap-2 font-bold text-white">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    Your strengths
                  </h2>
                  {result.strengths?.length ? (
                    <ul className="mt-4 space-y-2">
                      {result.strengths.map((item) => (
                        <li key={item.skill} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2 text-sm">
                          <span className="font-semibold text-slate-100">✓ {item.skill}</span>
                          <span className="flex items-center gap-2">
                            <StatusBadge status={item.user} />
                            {showPercents && (
                              <span className="text-xs text-slate-400">{item.demand_percent}% demand</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">No matching strengths found in the demanded skill set.</p>
                  )}
                </div>

                <div className="surface p-5">
                  <h2 className="flex items-center gap-2 font-bold text-white">
                    <AlertCircle className="h-5 w-5 text-rose-400" />
                    Skill gaps
                  </h2>
                  {result.gaps?.length ? (
                    <ul className="mt-4 space-y-2">
                      {result.gaps.map((item) => (
                        <li key={item.skill} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2 text-sm">
                          <span className="font-semibold text-slate-100">
                            {item.user === "Weak" ? "⚠" : "!"} {item.skill}
                          </span>
                          <span className="flex items-center gap-2">
                            <StatusBadge status={item.user} />
                            {showPercents && (
                              <span className="text-xs text-slate-400">{item.demand_percent}% demand</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">No gaps identified against demanded skills in this job set.</p>
                  )}
                </div>
              </div>

              {(result.strengths?.length > 0 || result.gaps?.length > 0) && (
                <div className="surface overflow-x-auto p-5">
                  <h2 className="font-bold text-white">Skill demand table</h2>
                  <table className="mt-4 w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-400">
                        <th className="pb-2 font-semibold">Skill</th>
                        <th className="pb-2 font-semibold">You</th>
                        {showPercents && <th className="pb-2 font-semibold">Job demand</th>}
                        <th className="pb-2 font-semibold">Jobs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...(result.strengths || []), ...(result.gaps || [])]
                        .sort((a, b) => (b.jobs_with_skill || 0) - (a.jobs_with_skill || 0))
                        .map((item) => (
                          <tr key={`row-${item.skill}`} className="border-b border-white/5 text-slate-200">
                            <td className="py-2.5 font-medium">{item.skill}</td>
                            <td className="py-2.5"><StatusBadge status={item.user} /></td>
                            {showPercents && <td className="py-2.5">{item.demand_percent}%</td>}
                            <td className="py-2.5 text-slate-400">{item.jobs_with_skill}/{result.jobs_analyzed}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="surface p-5">
                <h2 className="flex items-center gap-2 font-bold text-white">
                  <GraduationCap className="h-5 w-5 text-indigo-300" />
                  Recommended learning path
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Ordered by job demand among your gaps. Steps are Carevora curriculum outlines, not job statistics.
                </p>
                {result.learning_path?.length ? (
                  <ol className="mt-4 space-y-4">
                    {result.learning_path.map((item, index) => (
                      <li key={item.skill} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <p className="text-sm font-bold text-white">
                          {index + 1}. {item.skill}
                        </p>
                        {item.steps?.length ? (
                          <p className="mt-2 text-sm text-slate-300">{item.steps.join(" → ")}</p>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">No outline stored for this skill — prioritize it from job demand alone.</p>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">No gap-based learning path to show for this job set.</p>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
