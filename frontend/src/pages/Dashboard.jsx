import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CircleDollarSign,
  FileUp,
  Search,
  Sparkles,
  TrendingUp,
  UserRound,
  Wand2,
  GraduationCap,
  CheckSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { dashboardApi, applicationsApi } from "../api/client";
import { useUser } from "../context/UserContext";

const actions = [
  {
    to: "/resume",
    label: "Upload Resume",
    text: "Keep your latest PDF ready for AI analysis",
    icon: FileUp,
    color: "from-sky-500/15 to-cyan-500/5 text-sky-600",
  },
  {
    to: "/jobs",
    label: "Search Jobs",
    text: "Explore high-fit opportunities in real time",
    icon: Search,
    color: "from-indigo-500/15 to-violet-500/5 text-indigo-600",
  },
  {
    to: "/applications",
    label: "Applications",
    text: "Track your job application pipeline",
    icon: CheckSquare,
    color: "from-rose-500/15 to-pink-500/5 text-rose-600",
  },
  {
    to: "/chat",
    label: "AI Career Chat",
    text: "Ask Carevora AI about your next move",
    icon: Bot,
    color: "from-violet-500/15 to-fuchsia-500/5 text-violet-600",
  },
  {
    to: "/profile",
    label: "Resume Intelligence",
    text: "Review the latest resume insight and strengths",
    icon: Wand2,
    color: "from-emerald-500/15 to-lime-500/5 text-emerald-600",
  },
  {
    to: "/jobs",
    label: "Resume Match",
    text: "Compare your resume with top opportunities",
    icon: CircleDollarSign,
    color: "from-amber-500/15 to-orange-500/5 text-amber-600",
  },
  {
    to: "/interview",
    label: "AI Interview Simulator",
    text: "Practice technical & HR interviews",
    icon: GraduationCap,
    color: "from-fuchsia-500/15 to-pink-500/5 text-fuchsia-600",
  },
];

function ProgressRing({ value, label, accent = "#6366f1" }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, value));
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid h-28 w-28 place-items-center">
        <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r={radius} stroke="rgba(148,163,184,0.18)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke={accent}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-lg font-bold text-slate-100">{progress}</p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">score</p>
        </div>
      </div>
      <p className="text-xs font-semibold text-slate-300">{label}</p>
    </div>
  );
}

function SkeletonLine({ width = "100%" }) {
  return <div className="h-3 animate-pulse rounded-full bg-slate-700/80" style={{ width }} />;
}

function MetricCard({ title, value, hint, icon: Icon, tone = "from-violet-500/20 to-indigo-500/5", accent = "text-violet-300" }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_60px_-32px_rgba(76,29,149,0.8)] backdrop-blur-xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${tone} opacity-90`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-slate-300">{title}</p>
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          </div>
          <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-slate-950/80 ${accent}`}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-4 text-xs text-slate-300">{hint}</p>
      </div>
    </motion.div>
  );
}

function formatDate(value) {
  if (!value) return "Just now";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function companyInitials(company = "") {
  if (!company) return "C";
  return company
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function DashboardSkeleton() {
  return (
    <section className="space-y-6">
      <div className="h-40 animate-pulse rounded-[32px] bg-slate-800/80" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-sm">
            <div className="h-4 w-24 animate-pulse rounded-full bg-slate-700" />
            <div className="mt-4 h-8 w-20 animate-pulse rounded-full bg-slate-700" />
            <div className="mt-5 h-3 w-32 animate-pulse rounded-full bg-slate-700" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="h-60 animate-pulse rounded-[24px] bg-slate-800/80" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-60 animate-pulse rounded-[24px] bg-slate-800/80" />
          <div className="h-60 animate-pulse rounded-[24px] bg-slate-800/80" />
        </div>
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useUser();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appStats, setAppStats] = useState(null);

  const firstName = user?.full_name?.split(" ")[0] || "there";
  const profilePrepared = Boolean(user?.full_name && user?.email);

  useEffect(() => {
    let active = true;
    Promise.all([
      dashboardApi.get(),
      applicationsApi.getStats().catch(() => null)
    ])
      .then(([payload, stats]) => {
        if (!active) return;
        setDashboardData(payload);
        setAppStats(stats);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Dashboard data is unavailable right now.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = dashboardData?.dashboard_statistics || {};
  const resumeScore = stats.average_match_score ?? 0;
  const atsScore = stats.profile_completion ?? 0;
  const readinessScore = stats.career_readiness_score ?? 0;
  const profileCompletion = stats.profile_completion ?? 0;
  const resumeHealth = stats.resume_count ? "Strong" : "Needs update";
  const resumeStatus = stats.resume_count ? "Uploaded" : "Awaiting upload";

  const recentChat = dashboardData?.recent_ai_chat_history || [];
  const recentMatches = dashboardData?.resume_match_history || [];
  const recentActivity = dashboardData?.user_activity_timeline || [];
  const recommendedJobs = dashboardData?.recommended_jobs || [];

  const timeline = useMemo(() => {
    return [
      { step: "Profile setup", done: profilePrepared },
      { step: "Resume uploaded", done: Boolean(stats.resume_count) },
      { step: "Resume intelligence complete", done: Boolean(stats.intelligence_count) },
      { step: "Resume matching active", done: Boolean(stats.jobs_matched_count) },
    ];
  }, [profilePrepared, stats]);

  const insightItems = useMemo(() => {
    const items = [];
    if (stats.average_match_score) {
      items.push(`Average live match score: ${stats.average_match_score}% across your current resume/job comparisons.`);
    }
    if (stats.jobs_matched_count) {
      items.push(`You have ${stats.jobs_matched_count} stored resume match result${stats.jobs_matched_count === 1 ? "" : "s"} ready for review.`);
    }
    if (stats.intelligence_count) {
      items.push("Your uploaded resume has completed intelligence analysis, which is now feeding the dashboard insight feed.");
    }
    if (!items.length) {
      items.push("Your dashboard will populate automatically after you upload a resume, search jobs, or use AI chat.");
    }
    return items;
  }, [stats]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <section className="mx-auto max-w-3xl rounded-[24px] border border-white/10 bg-slate-900/80 p-6 text-sm text-slate-300">
        <p className="font-semibold text-white">Dashboard unavailable</p>
        <p className="mt-2 text-slate-400">{error}</p>
      </section>
    );
  }

  const performanceTrend = [
    Math.max(12, Math.min(100, resumeScore)),
    Math.max(12, Math.min(100, atsScore)),
    Math.max(12, Math.min(100, profileCompletion)),
    Math.max(12, Math.min(100, readinessScore)),
    Math.max(12, Math.min(100, Math.round((resumeScore + atsScore) / 2))),
    Math.max(12, Math.min(100, Math.round((profileCompletion + readinessScore) / 2))),
  ];

  return (
    <section className="space-y-6 bg-slate-950 px-1 py-1 text-slate-100 lg:px-2">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.35),_transparent_35%),linear-gradient(135deg,_#020617,_#111827)] px-6 py-8 text-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.7)] sm:px-9 sm:py-10"
      >
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-100">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered career workspace
          </span>

          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome back, {firstName}.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            {profilePrepared
              ? "Your dashboard is powered by live activity from the existing Carevora AI backend — chat, resume intelligence, job matching, and profile progress all stay in sync."
              : "Your profile is still being set up. Complete your details to unlock personalized coaching, job matching, and resume intelligence."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={user ? "/jobs" : "/profile"} className="btn-primary bg-white text-slate-900 hover:bg-indigo-50">
              {user ? "Find your next role" : "Set up your profile"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/chat" className="btn-secondary border-white/20 bg-white/5 text-white hover:bg-white/10">
              Ask Carevora AI
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard title="AI Resume Score" value={`${resumeScore}/100`} hint="Quality + positioning" icon={Sparkles} tone="from-violet-500/20 to-indigo-500/5" accent="text-violet-600" />
          <MetricCard title="ATS Score" value={`${atsScore}%`} hint="Profile completion readiness" icon={FileUp} tone="from-sky-500/20 to-cyan-500/5" accent="text-sky-600" />
          <MetricCard title="Career Score" value={`${readinessScore}%`} hint="Opportunity momentum" icon={TrendingUp} tone="from-emerald-500/20 to-lime-500/5" accent="text-emerald-600" />
          <MetricCard title="Jobs Matched" value={String(stats.jobs_matched_count ?? 0)} hint="Live match history" icon={BriefcaseBusiness} tone="from-amber-500/20 to-orange-500/5" accent="text-amber-600" />
          <MetricCard title="AI Interview Score" value={stats.latest_interview_score !== null && stats.latest_interview_score !== undefined ? `${stats.latest_interview_score}/100` : "N/A"} hint="Latest simulation performance" icon={GraduationCap} tone="from-fuchsia-500/20 to-pink-500/5" accent="text-fuchsia-600" />
          <MetricCard title="Applications" value={String(appStats?.Total ?? 0)} hint={`${appStats?.Interview ?? 0} interviews, ${appStats?.Offer ?? 0} offers`} icon={CheckSquare} tone="from-rose-500/20 to-pink-500/5" accent="text-rose-600" />
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }} className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_60px_-32px_rgba(76,29,149,0.8)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-300">Application Pipeline</p>
              <p className="text-3xl font-bold text-white">{appStats?.Total ?? 0}</p>
            </div>
            <Link to="/applications" className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300 hover:bg-violet-500/25 transition">View all</Link>
          </div>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Saved</span>
              <span className="font-semibold text-slate-200">{appStats?.Saved ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Applied</span>
              <span className="font-semibold text-slate-200">{appStats?.Applied ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Interview</span>
              <span className="font-semibold text-slate-200">{appStats?.Interview ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Offer</span>
              <span className="font-semibold text-emerald-400">{appStats?.Offer ?? 0}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_60px_-32px_rgba(76,29,149,0.8)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Live profile score</p>
              <h3 className="text-lg font-bold text-white">Performance pulse</h3>
            </div>
            <Sparkles className="h-5 w-5 text-violet-400" />
          </div>
          <div className="mt-5 grid grid-cols-6 items-end gap-3">
            {performanceTrend.map((point, index) => (
              <div key={`${point}-${index}`} className="flex flex-col items-center gap-2">
                <div className="flex h-28 w-full items-end rounded-2xl bg-slate-800/80 p-1">
                  <div className="w-full rounded-xl bg-gradient-to-t from-violet-600 to-indigo-400" style={{ height: `${Math.max(12, point)}%` }} />
                </div>
                <span className="text-[10px] text-slate-400">{index + 1}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_60px_-32px_rgba(76,29,149,0.8)] backdrop-blur-xl">
            <p className="text-sm text-slate-300">Resume status</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-white">{resumeStatus}</p>
                <p className="text-xs text-slate-400">Latest PDF ready for intelligence</p>
              </div>
              <div className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">{resumeHealth}</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_60px_-32px_rgba(76,29,149,0.8)] backdrop-blur-xl">
            <p className="text-sm text-slate-300">Profile completion</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-bold text-white">{profileCompletion}%</p>
                <p className="text-xs text-slate-400">Preference ready</p>
              </div>
              <div className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300">{profilePrepared ? "Ready" : "Action needed"}</div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_60px_-32px_rgba(76,29,149,0.8)] backdrop-blur-xl">
          <p className="text-sm text-slate-300">Quick actions</p>
          <div className="mt-4 grid gap-3">
            {actions.map(({ to, label, text, icon: Icon, color }) => (
              <Link key={label} to={to} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 transition duration-300 hover:-translate-y-0.5 hover:bg-slate-900/90">
                <div className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${color}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-slate-400">{text}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_60px_-32px_rgba(76,29,149,0.8)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-300">Recent activity</p>
              <h3 className="text-lg font-bold text-white">Timeline</h3>
            </div>
            <UserRound className="h-5 w-5 text-indigo-300" />
          </div>
          <div className="mt-5 space-y-3">
            {recentActivity.length ? recentActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-3">
                <span className="mt-1 grid h-8 w-8 place-items-center rounded-full bg-violet-500/15 text-violet-300">●</span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{formatDate(item.created_at)}</p>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl bg-slate-950/60 p-3 text-sm text-slate-300">No activity timeline available yet. Upload a resume or run a match to populate the feed.</div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_60px_-32px_rgba(76,29,149,0.8)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Recent AI chats</h3>
            <Bot className="h-5 w-5 text-violet-300" />
          </div>
          <div className="mt-4 space-y-3">
            {recentChat.length ? recentChat.map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-950/60 p-3">
                <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{item.kind === "rag" ? "AI (RAG)" : "AI"}</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-100">{item.question}</p>
                <p className="mt-2 text-xs text-slate-300">{item.answer}</p>
              </div>
            )) : <div className="rounded-2xl bg-slate-950/60 p-3 text-sm text-slate-300">No chat history yet. Ask Carevora AI to create the first dashboard entry.</div>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_60px_-32px_rgba(76,29,149,0.8)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Recent resume matches</h3>
            <BriefcaseBusiness className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="mt-4 space-y-3">
            {recentMatches.length ? recentMatches.map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-950/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">Job {item.job_id}</p>
                    <p className="text-xs text-slate-400">Resume {item.resume_id}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">{item.match_score}%</span>
                </div>
                {item.strengths?.length ? (
                  <p className="mt-2 text-xs text-slate-300">Strengths: {item.strengths.slice(0, 2).join(" • ")}</p>
                ) : null}
              </div>
            )) : <div className="rounded-2xl bg-slate-950/60 p-3 text-sm text-slate-300">No resume match history yet. Run a match from the jobs workflow to populate this section.</div>}
          </div>
        </motion.div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_60px_-32px_rgba(76,29,149,0.8)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Recommended jobs</h3>
            <Search className="h-5 w-5 text-indigo-300" />
          </div>
          <div className="mt-4 space-y-3">
            {recommendedJobs.length ? recommendedJobs.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-800 text-xs font-bold text-white">
                    {companyInitials(item.company || item.title)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{item.title}</p>
                    <p className="truncate text-xs text-slate-400">{item.company} • {item.location}</p>
                  </div>
                  <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300">{item.recommendation_score}%</span>
                </div>
              </div>
            )) : <div className="rounded-2xl bg-slate-950/60 p-3 text-sm text-slate-300">No recommended jobs available yet. Job search and matching will update this list automatically.</div>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_60px_-32px_rgba(76,29,149,0.8)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Latest resume insights</h3>
            <Wand2 className="h-5 w-5 text-sky-300" />
          </div>
          <div className="mt-4 space-y-3">
            {insightItems.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-950/60 p-3 text-sm text-slate-200">{item}</div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-[24px] border border-white/10 bg-slate-900/80 p-5 shadow-[0_18px_60px_-32px_rgba(76,29,149,0.8)] backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">AI workspace snapshot</h3>
          <UserRound className="h-5 w-5 text-indigo-300" />
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] bg-slate-950/60 p-4">
            <p className="text-sm text-slate-300">Resume score</p>
            <div className="mt-4 flex justify-center">
              <ProgressRing value={resumeScore} label="AI Resume Score" accent="#8b5cf6" />
            </div>
          </div>
          <div className="rounded-[24px] bg-slate-950/60 p-4">
            <p className="text-sm text-slate-300">ATS compatibility</p>
            <div className="mt-4 flex justify-center">
              <ProgressRing value={atsScore} label="Compatibility" accent="#0ea5e9" />
            </div>
          </div>
          <div className="rounded-[24px] bg-slate-950/60 p-4">
            <p className="text-sm text-slate-300">Career readiness</p>
            <div className="mt-4 flex justify-center">
              <ProgressRing value={readinessScore} label="Readiness" accent="#10b981" />
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
