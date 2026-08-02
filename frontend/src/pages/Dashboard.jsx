import { useEffect } from "react";
import { ArrowRight, Bot, BriefcaseBusiness, FileUp, Search, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import api from "../services/api";
import { useUser } from "../context/UserContext";

const actions = [
  {
    to: "/jobs",
    label: "Search jobs",
    text: "Explore tailored opportunities",
    icon: Search,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    to: "/resume",
    label: "Upload resume",
    text: "Keep your profile current",
    icon: FileUp,
    color: "bg-sky-50 text-sky-600",
  },
  {
    to: "/chat",
    label: "Ask JobPilot AI",
    text: "Get career guidance on demand",
    icon: Bot,
    color: "bg-violet-50 text-violet-600",
  },
];

export default function Dashboard() {
  const { user } = useUser();
  const firstName = user?.full_name?.split(" ")[0] || "there";

  // Backend Health Check
  useEffect(() => {
    api
      .get("/health")
      .then((response) => {
        console.log("✅ Backend Connected:", response.data);
      })
      .catch((error) => {
        console.error("❌ Backend Connection Failed:", error);
      });
  }, []);

  return (
    <section className="animate-fade-up">
      <div className="overflow-hidden rounded-3xl bg-slate-900 px-6 py-8 text-white shadow-glow sm:px-9 sm:py-10">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-100">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered career workspace
          </span>

          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Good to see you, {firstName}.
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
            Build momentum with roles worth your time and a career copilot that
            is ready when you are.
          </p>

          <Link
            to={user ? "/jobs" : "/profile"}
            className="btn-primary mt-6 bg-white text-slate-900 hover:bg-indigo-50"
          >
            {user ? "Find your next role" : "Set up your profile"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="pointer-events-none absolute" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          [
            "Profile",
            user ? "Ready" : "Action needed",
            user ? "text-emerald-600" : "text-amber-600",
          ],
          ["Job search", "Live", "text-indigo-600"],
          ["AI assistant", "Available", "text-violet-600"],
        ].map(([label, value, color]) => (
          <div key={label} className="surface p-5">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-9">
        <h2 className="text-lg font-bold text-slate-900">
          Continue building your search
        </h2>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {actions.map(({ to, label, text, icon: Icon, color }) => (
            <Link
              key={to}
              to={to}
              className="surface group p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-xl ${color}`}
              >
                <Icon className="h-5 w-5" />
              </span>

              <h3 className="mt-5 font-semibold text-slate-900">{label}</h3>

              <p className="mt-1 text-sm text-slate-500">{text}</p>

              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
                Open
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="surface mt-8 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900">
              Make your search more effective
            </h2>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            A complete profile and a current resume help you move quickly when
            the right job appears.
          </p>
        </div>

        <Link className="btn-secondary shrink-0" to="/resume">
          Manage resume
        </Link>
      </div>
    </section>
  );
}
