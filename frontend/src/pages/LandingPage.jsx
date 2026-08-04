import { ArrowRight, Bot, BriefcaseBusiness, ChevronRight, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Wand2,
    title: "AI career orchestration",
    description:
      "Blend resume intelligence, job discovery, and strategic guidance into one focused workspace.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Job matching, sharpened",
    description:
      "Compare resume strengths against live job data and uncover the next role worth pursuing.",
  },
  {
    icon: Bot,
    title: "Always-on co-pilot",
    description:
      "Ask career questions in natural language and surface recommendations grounded in your search context.",
  },
  {
    icon: ShieldCheck,
    title: "Professional-grade trust",
    description:
      "Secure profile handling, polished workflows, and reliable outputs without disrupting the experience.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-6 sm:px-8 lg:px-10">
        <header className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-lg font-bold">
              C
            </span>

            <div>
              <p className="text-sm font-semibold tracking-wide text-white">
                Carevora AI
              </p>

              <p className="text-[11px] text-slate-300">
                Your AI Career Operating System
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              className="text-sm text-slate-300 transition hover:text-white"
              to="/signin"
            >
              Sign in
            </Link>

            <Link
              className="btn-secondary border-white/20 bg-white/5 text-white hover:bg-white/10"
              to="/signup"
            >
              Create account
            </Link>
          </div>
        </header>

        <main className="pb-8 pt-10 sm:pt-14">
          <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.35),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(20,184,166,0.22),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(17,24,39,0.9))] px-6 py-10 shadow-2xl shadow-indigo-950/40 sm:px-10 sm:py-14">
            <div className="absolute -right-20 top-0 h-52 w-52 rounded-full bg-violet-500/20 blur-3xl" />

            <div className="absolute left-0 top-20 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl" />

            <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-indigo-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-Powered Career Platform
                </span>

                <h1 className="mt-5 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Your AI Career Operating System
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Carevora AI turns resume insight, job search momentum, and
                  career strategy into one elegant, high-trust workflow.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    className="btn-primary bg-white text-slate-900 hover:bg-slate-100"
                    to="/signup"
                  >
                    Start free
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    className="btn-secondary border-white/15 bg-white/5 text-white hover:bg-white/10"
                    to="/dashboard"
                  >
                    Explore workspace
                  </Link>
                </div>              </div>

              <div className="glass-panel rounded-[28px] p-4 sm:p-5">
                <div className="rounded-[22px] border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-2.5 py-1">
                      <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                      Career intelligence
                    </span>

                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-300">
                      Live
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {[
                      ["Resume fit analysis", "92% match confidence"],
                      ["Role discovery", "12 opportunities surfaced"],
                      ["AI guidance", "Action plan ready"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-white">
                            {label}
                          </p>

                          <span className="text-xs text-cyan-200">
                            {value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-indigo-400/20 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 p-4">
                    <p className="text-sm text-slate-200">
                      Recommended next move
                    </p>

                    <p className="mt-2 text-lg font-semibold text-white">
                      Prioritize Java + backend skills in the next matching pass.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="glass-panel rounded-3xl p-5 transition duration-300 hover:-translate-y-1"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
                  <Icon className="h-5 w-5" />
                </span>

                <h2 className="mt-4 text-lg font-semibold text-white">
                  {title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {description}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-10 rounded-[30px] border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-violet-300">
                  Built for momentum
                </p>

                <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                  Move from job search to career clarity.
                </h2>
              </div>

              <Link
                className="btn-primary bg-gradient-to-r from-violet-500 to-indigo-500 text-white"
                to="/signup"
              >
                Get started
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </main>

        <footer className="glass-panel mt-6 rounded-[24px] px-5 py-5 text-sm text-slate-300">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-white">Carevora AI</p>

              <p className="text-xs text-slate-400">
                Your AI Career Operating System
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <span className="transition hover:text-white">Privacy</span>
              <span className="transition hover:text-white">Security</span>
              <span className="transition hover:text-white">Terms</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
