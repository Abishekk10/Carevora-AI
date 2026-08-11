import {
  ArrowRight,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import { authApi } from "../api/client";
import { useUser } from "../context/UserContext";

export default function AuthPage({ mode = "signin" }) {
  const isSignUp = mode === "signup";

  const navigate = useNavigate();
  const { setUser } = useUser();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      let result;

      if (isSignUp) {
        result = await authApi.register({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
        });
      } else {
        result = await authApi.login({
          email: form.email,
          password: form.password,
        });
      }

      setUser(result.user, result.token);

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.32),_transparent_35%),linear-gradient(135deg,_#020617,_#0f172a)] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="glass-panel overflow-hidden rounded-[32px] border border-white/10">
          <div className="grid min-h-[680px] lg:grid-cols-[1fr_0.9fr]">

            <div className="flex flex-col justify-between bg-[linear-gradient(135deg,rgba(15,23,42,0.9),rgba(30,41,59,0.85))] p-6 sm:p-10">

              <div>

                <Link className="inline-flex items-center gap-3" to="/">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-lg font-bold">
                    C
                  </span>

                  <div>
                    <p className="text-sm font-semibold">
                      Carevora AI
                    </p>

                    <p className="text-[11px] text-slate-300">
                      Your AI Career Operating System
                    </p>
                  </div>
                </Link>

                <div className="mt-12 max-w-lg">

                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-violet-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    Trusted by ambitious job seekers
                  </span>

                  <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                    {isSignUp
                      ? "Create your AI career workspace"
                      : "Welcome back to Carevora AI"}
                  </h1>

                  <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                    {isSignUp
                      ? "Set up your profile, upload your resume and unlock AI-powered career guidance."
                      : "Continue your career journey with resume intelligence, AI job matching and personalized coaching."}
                  </p>

                </div>

              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">

                {[
                  [
                    "Job Discovery",
                    "Find opportunities from multiple job platforms",
                  ],
                  [
                    "Resume Intelligence",
                    "AI-powered resume analysis and matching",
                  ],
                ].map(([title, desc]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-sm font-semibold">
                      {title}
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {desc}
                    </p>
                  </div>
                ))}

              </div>

            </div>

            <div className="flex items-center justify-center p-6 sm:p-10">

              <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/65 p-6 shadow-2xl shadow-black/35 backdrop-blur-xl">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs uppercase tracking-[0.24em] text-violet-300">
                      {isSignUp ? "Create Account" : "Sign In"}
                    </p>

                    <h2 className="mt-2 text-2xl font-bold">
                      {isSignUp
                        ? "Join Carevora AI"
                        : "Access your workspace"}
                    </h2>

                  </div>

                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
                    <Sparkles className="h-5 w-5" />
                  </span>

                </div>

                {error && (
                  <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <form onSubmit={submit} className="mt-6 space-y-4">                  {isSignUp && (
                    <label className="block">
                      <span className="mb-2 flex items-center gap-2 text-sm text-slate-200">
                        <UserRound className="h-4 w-4" />
                        Full name
                      </span>

                      <input
                        className="field border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                        placeholder="Alex Morgan"
                        value={form.full_name}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            full_name: e.target.value,
                          })
                        }
                        required
                      />
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm text-slate-200">
                      <Mail className="h-4 w-4" />
                      Email address
                    </span>

                    <input
                      className="field border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                      type="email"
                      placeholder="you@carevora.ai"
                      value={form.email}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          email: e.target.value,
                        })
                      }
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-sm text-slate-200">
                      <LockKeyhole className="h-4 w-4" />
                      Password
                    </span>

                    <input
                      className="field border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                      type="password"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          password: e.target.value,
                        })
                      }
                      required
                      minLength={8}
                    />
                  </label>

                  <button
                    className="btn-primary w-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white"
                    type="submit"
                    disabled={loading}
                  >
                    {loading
                      ? isSignUp
                        ? "Creating Account..."
                        : "Signing In..."
                      : isSignUp
                      ? "Create Account"
                      : "Sign In"}

                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-slate-300">
                  {isSignUp
                    ? "Already have an account?"
                    : "Need a new account?"}{" "}
                  <Link
                    className="font-semibold text-violet-300 hover:text-white"
                    to={isSignUp ? "/signin" : "/signup"}
                  >
                    {isSignUp ? "Sign In" : "Create One"}
                  </Link>
                </p>

              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
