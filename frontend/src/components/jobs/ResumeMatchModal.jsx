import {
  Award,
  CheckCircle2,
  CircleAlert,
  Lightbulb,
  X,
} from "lucide-react";

const scoreTheme = (score) => {
  if (score >= 90)
    return {
      stroke: "stroke-emerald-400",
      text: "text-emerald-300",
      label: "Excellent match",
      panel: "bg-emerald-500/10",
    };

  if (score >= 70)
    return {
      stroke: "stroke-indigo-400",
      text: "text-indigo-300",
      label: "Strong match",
      panel: "bg-indigo-500/10",
    };

  if (score >= 50)
    return {
      stroke: "stroke-orange-400",
      text: "text-orange-300",
      label: "Potential match",
      panel: "bg-orange-500/10",
    };

  return {
    stroke: "stroke-rose-400",
    text: "text-rose-300",
    label: "Development needed",
    panel: "bg-rose-500/10",
  };
};

function InsightList({ title, items, icon: Icon, iconClass }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-white">
        <Icon className={`h-5 w-5 ${iconClass}`} />
        {title}
      </h3>

      {items?.length ? (
        <ul className="mt-3 space-y-2.5">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex gap-2.5 text-sm leading-5 text-slate-300"
            >
              <span
                className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current ${iconClass}`}
              />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-400">
          No items identified.
        </p>
      )}
    </section>
  );
}

export default function ResumeMatchModal({
  job,
  match,
  isLoading,
  error,
  onClose,
}) {
  const score = match?.match_score ?? 0;
  const theme = scoreTheme(score);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 pt-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-match-title"
      onMouseDown={onClose}
    >
      <div
        className="relative my-6 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-slate-950/95 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              AI Resume Match
            </p>

            <h2
              id="resume-match-title"
              className="mt-1 text-xl font-bold text-white"
            >
              {job?.title}
            </h2>

            <p className="mt-1 text-sm text-slate-300">
              {job?.company} • {job?.location}
            </p>
          </div>

          <button
            className="rounded-xl p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={onClose}
            aria-label="Close resume match"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {isLoading ? (
          <div className="grid min-h-[350px] place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                <Award className="h-7 w-7 animate-pulse" />
              </span>

              <h3 className="mt-5 font-semibold text-white">
                Analyzing your fit
              </h3>

              <p className="mt-2 text-sm text-slate-300">
                Comparing your skills and experience with this role...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="p-7">
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-5 text-sm text-rose-200">
              <CircleAlert className="mb-2 h-6 w-6" />
              {error}
            </div>
          </div>
        ) : (
          match && (
            <div className="p-5 sm:p-7">
              <div
                className={`flex flex-col items-center gap-5 rounded-2xl border border-white/10 p-5 text-center sm:flex-row sm:text-left ${theme.panel}`}
              >
                <div className="relative h-32 w-32 shrink-0">
                  <svg
                    className="h-full w-full -rotate-90"
                    viewBox="0 0 128 128"
                  >
                    <circle
                      className="stroke-slate-700"
                      strokeWidth="10"
                      fill="none"
                      cx="64"
                      cy="64"
                      r={radius}
                    />

                    <circle
                      className={theme.stroke}
                      strokeWidth="10"
                      strokeLinecap="round"
                      fill="none"
                      cx="64"
                      cy="64"
                      r={radius}
                      strokeDasharray={circumference}
                      strokeDashoffset={
                        circumference * (1 - score / 100)
                      }
                    />
                  </svg>

                  <span
                    className={`absolute inset-0 grid place-items-center text-3xl font-bold ${theme.text}`}
                  >
                    {score}%
                  </span>
                </div>

                <div>
                  <p className={`font-bold ${theme.text}`}>
                    {theme.label}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Your resume was evaluated against this role's skills,
                    experience, education, projects, and certifications.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InsightList
                  title="Strengths"
                  items={match.strengths}
                  icon={CheckCircle2}
                  iconClass="text-emerald-300"
                />

                <InsightList
                  title="Missing Skills"
                  items={match.missing_skills}
                  icon={CircleAlert}
                  iconClass="text-orange-300"
                />

                <InsightList
                  title="Recommendations"
                  items={match.recommendations}
                  icon={Lightbulb}
                  iconClass="text-indigo-300"
                />

                <InsightList
                  title="Learning Roadmap"
                  items={match.learning_roadmap}
                  icon={Award}
                  iconClass="text-violet-300"
                />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}