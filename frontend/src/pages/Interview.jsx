import { useEffect, useRef, useState } from "react";
import {
  Award,
  AlertTriangle,
  Lightbulb,
  Send,
  Brain,
  GraduationCap,
  History,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

import { interviewApi } from "../api/client";
import { useUser } from "../context/UserContext";

function ProgressRing({ value, label, size = 160, strokeWidth = 14, accent = "#8b5cf6" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, value));
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(148,163,184,0.1)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={accent}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute text-center">
          <p className="text-4xl font-extrabold text-white tracking-tight">{progress}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">score</p>
        </div>
      </div>
      {label && <p className="text-sm font-semibold text-slate-300">{label}</p>}
    </div>
  );
}

export default function Interview() {
  const { user } = useUser();
  const chatEndRef = useRef(null);

  // Core view states: "setup" | "chat" | "report" | "no-resume"
  const [view, setView] = useState("setup");
  
  // Setup parameters
  const [type, setType] = useState("Mixed");
  const [difficulty, setDifficulty] = useState("Medium");
  
  // History log
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  // In-progress simulation state
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [chatTranscript, setChatTranscript] = useState([]); // [{ type: 'ai' | 'user', text: '', feedback?: { score, feedback } }]
  const [answerInput, setAnswerInput] = useState("");
  const [loadingAction, setLoadingAction] = useState(false); // for starting/submitting
  const [errorMessage, setErrorMessage] = useState("");
  const [retryableError, setRetryableError] = useState(false);
  const [resumeMissing, setResumeMissing] = useState(false);

  // Completed report state
  const [finalReport, setFinalReport] = useState(null);
  const [reportQuestions, setReportQuestions] = useState([]);

  // Selected history session modal
  const [selectedSession, setSelectedSession] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Resume check state
  const [resumeCheckLoading, setResumeCheckLoading] = useState(true);
  const [resumeCheckData, setResumeCheckData] = useState(null);

  useEffect(() => {
    fetchHistory();
    checkResumeAvailability();
  }, []);

  useEffect(() => {
    if (view === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatTranscript, view]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await interviewApi.getHistory();
      setHistory(data || []);
      setHistoryError("");
    } catch (err) {
      setHistoryError(err.message || "Failed to load interview history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const checkResumeAvailability = async () => {
    setResumeCheckLoading(true);
    try {
      const data = await interviewApi.checkResume();
      setResumeCheckData(data);
      if (!data.has_resume) {
        setView("no-resume");
        setResumeMissing(true);
      } else {
        setResumeMissing(false);
        if (view === "no-resume") {
          setView("setup");
        }
      }
    } catch (err) {
      setResumeCheckData({ has_resume: false, message: err.message || "Could not verify your resume status." });
      setView("no-resume");
      setResumeMissing(true);
    } finally {
      setResumeCheckLoading(false);
    }
  };

  const handleStartInterview = async () => {
    setLoadingAction(true);
    setErrorMessage("");
    setRetryableError(false);
    setResumeMissing(false);
    try {
      const resumeCheck = await interviewApi.checkResume();
      setResumeCheckData(resumeCheck);
      if (!resumeCheck.has_resume) {
        setView("no-resume");
        setResumeMissing(true);
        setLoadingAction(false);
        return;
      }

      const data = await interviewApi.startSession({ interview_type: type, difficulty });
      setSession(data.session);
      setCurrentQuestion(data.question);
      setChatTranscript([
        { type: "ai", text: `Welcome to your mock interview simulator. I have reviewed your resume and custom-built 5 tailored questions. Let's begin.\n\nHere is your first question:\n\n**${data.question.question_text}**` }
      ]);
      setView("chat");
    } catch (err) {
      const message = err.message || "Could not start interview. Please try again.";
      if (message.toLowerCase().includes("resume")) {
        setView("no-resume");
        setResumeMissing(true);
        setResumeCheckData({ has_resume: false, message });
      } else {
        const isGenerationFailure = /generate|try again|couldn't generate|moment/i.test(message);
        setErrorMessage(
          isGenerationFailure
            ? "We couldn't generate your interview questions right now. Please try again in a moment."
            : message
        );
        setRetryableError(isGenerationFailure);
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const canStartInterview = Boolean(resumeCheckData?.has_resume) && !resumeCheckLoading;

  const handleSubmitAnswer = async () => {
    if (!answerInput.trim() || loadingAction) return;
    
    const userAns = answerInput.trim();
    setAnswerInput("");
    setLoadingAction(true);
    setErrorMessage("");

    // Append user answer immediately to local chat transcript
    setChatTranscript(prev => [...prev, { type: "user", text: userAns }]);

    try {
      const result = await interviewApi.submitAnswer({
        session_id: session.id,
        question_id: currentQuestion.id,
        answer: userAns
      });

      // Update transcript with immediate feedback for the answered question
      setChatTranscript(prev => [
        ...prev,
        {
          type: "ai",
          text: `**Immediate AI Feedback [Score: ${result.evaluation.score}/100]**:\n${result.evaluation.feedback}`
        }
      ]);

      if (result.status === "active" && result.next_question) {
        setCurrentQuestion(result.next_question);
        // Ask next question after a brief delay for conversational flow
        setTimeout(() => {
          setChatTranscript(prev => [
            ...prev,
            { type: "ai", text: `**Next Question (${result.next_question.question_order + 1} of 5)**:\n\n${result.next_question.question_text}` }
          ]);
        }, 800);
      } else {
        // Complete state! Load final report
        setFinalReport(result.session);
        // Fetch full transcript details to display on report screen
        const details = await interviewApi.getSessionDetails(session.id);
        setReportQuestions(details.questions || []);
        setView("report");
        fetchHistory(); // refresh setup screen history log
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to submit answer. Please try again.");
    } finally {
      setLoadingAction(false);
    }
  };

  const viewPastSessionReport = async (sessionId) => {
    setModalLoading(true);
    setSelectedSession(null);
    try {
      const details = await interviewApi.getSessionDetails(sessionId);
      setSelectedSession(details);
    } catch (err) {
      alert(err.message || "Failed to retrieve session details.");
    } finally {
      setModalLoading(false);
    }
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case "Easy": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
      case "Medium": return "text-amber-400 bg-amber-500/10 border-amber-500/25";
      case "Hard": return "text-rose-400 bg-rose-500/10 border-rose-500/25";
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/25";
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">AI Interview Simulator</h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">Practice tailored technical and HR interviews, get instant grading, and compile weakness insights using your resume.</p>
        </div>
        {view !== "setup" && view !== "no-resume" && (
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to exit the current simulator view?")) {
                setView("setup");
                setSession(null);
                setCurrentQuestion(null);
                setChatTranscript([]);
                setFinalReport(null);
              }
            }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit Simulator
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* NO RESUME SCREEN */}
        {view === "no-resume" && (
          <motion.div
            key="no-resume"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="rounded-[28px] border border-white/10 bg-slate-900/60 p-8 shadow-xl backdrop-blur-xl text-center"
          >
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 text-rose-400">
              <AlertCircle className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-2xl font-bold text-white">Resume Required for Interview Simulator</h2>
            <p className="mt-3 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              The AI Interview Simulator generates highly relevant questions dynamically based on your actual resume background and skills. You need to upload and process a resume before starting practice sessions.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/resume" 
                className="btn-primary inline-flex items-center gap-2 justify-center"
              >
                <GraduationCap className="h-4 w-4" />
                Go to Resume Intelligence
              </Link>
              <button
                onClick={checkResumeAvailability}
                disabled={resumeCheckLoading}
                className="btn-secondary inline-flex items-center gap-2 justify-center disabled:opacity-50"
              >
                {resumeCheckLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Check Again
              </button>
            </div>
            {resumeCheckData && resumeCheckData.message && (
              <p className="mt-6 text-xs text-slate-500">{resumeCheckData.message}</p>
            )}
          </motion.div>
        )}

        {/* SETUP SCREEN */}
        {view === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid gap-8 lg:grid-cols-[1fr_0.90fr]"
          >
            {/* CONFIG PANEL */}
            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/20">
                  <Brain className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-white">Configure Session</h2>
                  <p className="text-xs text-slate-400">Tailor the mock interviewer to your target level</p>
                </div>
              </div>

              {resumeMissing && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-slate-300 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">Resume Required</p>
                    <p className="mt-1 text-xs text-slate-400">The AI Interview Simulator generates highly relevant questions dynamically based on your background. Please upload a PDF resume in the Resume dashboard first.</p>
                    <Link to="/resume" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:underline">
                      Go to Resume Intelligence <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="space-y-3">
                    <span>{errorMessage}</span>
                    {retryableError && (
                      <button
                        type="button"
                        onClick={handleStartInterview}
                        disabled={loadingAction || !canStartInterview}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 transition disabled:opacity-50"
                      >
                        {loadingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        Try Again
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* INTERVIEW TYPE SELECTOR */}
                <div>
                  <label className="text-sm font-semibold text-slate-300">Interview Type</label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {[
                      { value: "Mixed", label: "Mixed AI", desc: "Technical + Behavioral combination" },
                      { value: "Technical", label: "Technical", desc: "Algorithms, code, & architecture" },
                      { value: "HR", label: "HR & Culture", desc: "Behavioral fit & STAR scenarios" }
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setType(item.value)}
                        className={`rounded-2xl border p-4 text-left transition hover:scale-[1.01] ${
                          type === item.value
                            ? "border-violet-500 bg-violet-600/15 text-white shadow-lg shadow-violet-900/10"
                            : "border-white/10 bg-slate-950/40 text-slate-300 hover:bg-slate-950/80"
                        }`}
                      >
                        <p className="font-bold text-sm">{item.label}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* DIFFICULTY SELECTOR */}
                <div>
                  <label className="text-sm font-semibold text-slate-300">Difficulty Level</label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {[
                      { value: "Easy", label: "Easy", desc: "Foundational & direct concepts" },
                      { value: "Medium", label: "Medium", desc: "Standard applied challenges" },
                      { value: "Hard", label: "Hard", desc: "Senior architecture & debugging" }
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setDifficulty(item.value)}
                        className={`rounded-2xl border p-4 text-left transition hover:scale-[1.01] ${
                          difficulty === item.value
                            ? "border-indigo-500 bg-indigo-600/15 text-white shadow-lg shadow-indigo-900/10"
                            : "border-white/10 bg-slate-950/40 text-slate-300 hover:bg-slate-950/80"
                        }`}
                      >
                        <p className="font-bold text-sm">{item.label}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartInterview}
                disabled={loadingAction || !canStartInterview}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 font-bold text-white shadow-lg shadow-indigo-900/40 hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50"
              >
                {loadingAction ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating tailored questions... (takes ~5s)
                  </>
                ) : !canStartInterview ? (
                  <>
                    <AlertCircle className="h-5 w-5" />
                    Upload a parsed resume to begin
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Launch Interview Simulator
                  </>
                )}
              </button>
            </div>

            {/* HISTORY LOG PANEL */}
            <div className="rounded-[28px] border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl sm:p-8 flex flex-col h-[520px]">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-indigo-400">
                    <History className="h-5 w-5" />
                  </span>
                  <h3 className="font-bold text-white">Session History</h3>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400 font-semibold">{history.length} completed</span>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
                {historyLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                    <span className="text-xs">Loading simulator logs...</span>
                  </div>
                ) : historyError ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs text-center p-4">{historyError}</div>
                ) : history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 gap-3">
                    <GraduationCap className="h-10 w-10 text-slate-700" />
                    <div>
                      <p className="font-medium text-slate-400">No mock interviews completed yet</p>
                      <p className="mt-1 text-xs text-slate-600">Start your first simulated interview to begin logging results.</p>
                    </div>
                  </div>
                ) : (
                  history.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 hover:bg-slate-950/80 transition flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">{session.interview_type} Interview</span>
                          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${getDifficultyColor(session.difficulty)}`}>
                            {session.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {new Date(session.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-extrabold text-indigo-400">{session.overall_score}/100</p>
                          <p className="text-[10px] uppercase text-slate-500">score</p>
                        </div>
                        <button
                          onClick={() => viewPastSessionReport(session.id)}
                          disabled={modalLoading}
                          className="rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
                        >
                          View Report
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* INTERACTIVE CHAT SCREEN */}
        {view === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col rounded-[32px] border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-xl overflow-hidden h-[620px]"
          >
            {/* CHAT HEADER */}
            <div className="border-b border-white/10 bg-slate-950/65 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-600/15 text-violet-400">
                  <Brain className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-white">{type} Interview simulator</h3>
                  <p className="text-xs text-slate-400">Level: {difficulty}</p>
                </div>
              </div>

              {currentQuestion && (
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-semibold">Question Progress</p>
                  <p className="text-sm font-bold text-indigo-400">{currentQuestion.question_order + 1} / 5</p>
                </div>
              )}
            </div>

            {/* CHAT BUBBLES AREA */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-950/20">
              {chatTranscript.map((bubble, index) => {
                const isAI = bubble.type === "ai";
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-start gap-3.5 ${!isAI ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-bold text-xs ${
                      isAI ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-900/30" : "bg-slate-800 text-slate-300"
                    }`}>
                      {isAI ? "AI" : (user?.full_name ? user.full_name[0].toUpperCase() : "U")}
                    </div>

                    {/* Chat Bubble Body */}
                    <div className="max-w-[75%] space-y-2">
                      <div className={`rounded-[22px] px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                        isAI
                          ? "border border-white/5 bg-slate-900/90 text-slate-200"
                          : "bg-indigo-600 text-white"
                      }`}>
                        <div className="whitespace-pre-line font-medium">
                          {bubble.text.split("\n\n").map((chunk, cIdx) => {
                            // Render bullet points nicely
                            if (chunk.startsWith("**Immediate AI Feedback")) {
                              return (
                                <div key={cIdx} className="border-t border-white/10 mt-3 pt-3">
                                  <span className="text-xs uppercase font-extrabold tracking-wider text-violet-400 block mb-1">{chunk.split("\n")[0]}</span>
                                  <p className="text-slate-300 text-xs italic leading-relaxed">{chunk.split("\n").slice(1).join("\n")}</p>
                                </div>
                              );
                            }
                            return <p key={cIdx} className="mb-2 last:mb-0">{chunk}</p>;
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {loadingAction && chatTranscript[chatTranscript.length - 1]?.type === "user" && (
                <div className="flex items-start gap-3.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-900/30 font-bold text-xs">AI</div>
                  <div className="rounded-[22px] px-5 py-3.5 border border-white/5 bg-slate-900/90 text-slate-400 text-xs italic flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                    AI is grading your response and retrieving feedback...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* INPUT FOOTER */}
            <div className="border-t border-white/10 bg-slate-950/60 p-4">
              {errorMessage && (
                <p className="text-xs text-rose-400 font-semibold mb-2 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errorMessage}
                </p>
              )}
              <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-slate-950 p-2.5">
                <textarea
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitAnswer();
                    }
                  }}
                  placeholder="Type your professional response here... (Press Enter to submit, Shift+Enter for newline)"
                  disabled={loadingAction}
                  rows={2}
                  className="flex-1 resize-none bg-transparent px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-0 custom-scrollbar disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleSubmitAnswer}
                  disabled={!answerInput.trim() || loadingAction}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-800/40 hover:bg-violet-500 hover:scale-[1.03] active:scale-[0.98] transition disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* REPORT SCREEN */}
        {view === "report" && finalReport && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* OVERVIEW PANEL */}
            <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.2),_transparent_40%),linear-gradient(135deg,_#0f172a,_#020617)] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="grid gap-6 items-center md:grid-cols-[160px_1fr]">
                <div className="flex justify-center md:justify-start">
                  <ProgressRing value={finalReport.overall_score} size={150} strokeWidth={12} accent="#8b5cf6" />
                </div>
                <div className="space-y-3 text-center md:text-left">
                  <div className="flex flex-wrap justify-center md:justify-start items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                      <Award className="h-3.5 w-3.5" />
                      Mock Interview Report Complete
                    </span>
                    <span className="text-xs font-medium border border-white/10 px-2 py-0.5 rounded-full bg-slate-900 text-slate-300">{finalReport.interview_type} • {finalReport.difficulty}</span>
                  </div>
                  <h2 className="text-2xl font-black text-white sm:text-3xl">Performance Synthesis</h2>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                    {finalReport.feedback_report?.summary || "Your mock interview has been analyzed. The evaluation score reflects accuracy, depth, confidence, and culture alignment based on the 5 generated questions."}
                  </p>
                </div>
              </div>
            </div>

            {/* GRIDS: STRENGTHS, WEAKNESSES, SUGGESTIONS */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* STRENGTHS */}
              <div className="rounded-[24px] border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md flex flex-col space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 text-emerald-400">
                  <Award className="h-5 w-5" />
                  <h3 className="font-bold text-white">Demonstrated Strengths</h3>
                </div>
                <ul className="space-y-2 flex-1">
                  {finalReport.feedback_report?.strengths?.length > 0 ? (
                    finalReport.feedback_report.strengths.map((item, i) => (
                      <li key={i} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                        <span className="text-emerald-400 text-sm mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-slate-500 italic">No specific strengths generated.</li>
                  )}
                </ul>
              </div>

              {/* WEAKNESSES */}
              <div className="rounded-[24px] border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md flex flex-col space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-bold text-white">Areas for Growth</h3>
                </div>
                <ul className="space-y-2 flex-1">
                  {finalReport.feedback_report?.weaknesses?.length > 0 ? (
                    finalReport.feedback_report.weaknesses.map((item, i) => (
                      <li key={i} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                        <span className="text-rose-400 text-sm mt-0.5">⚠</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-slate-500 italic">No specific growth areas generated.</li>
                  )}
                </ul>
              </div>

              {/* SUGGESTIONS */}
              <div className="rounded-[24px] border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-md flex flex-col space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 text-amber-400">
                  <Lightbulb className="h-5 w-5" />
                  <h3 className="font-bold text-white">Actionable Suggestions</h3>
                </div>
                <ul className="space-y-2 flex-1">
                  {finalReport.feedback_report?.suggestions?.length > 0 ? (
                    finalReport.feedback_report.suggestions.map((item, i) => (
                      <li key={i} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                        <span className="text-amber-400 text-sm mt-0.5">💡</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-slate-500 italic">No suggestions generated.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* FULL TRANSCRIPT REVIEW */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Review Q&A Transcript</h3>
              <div className="space-y-4">
                {reportQuestions.map((q, idx) => (
                  <div key={q.id} className="rounded-[24px] border border-white/10 bg-slate-900/40 p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-indigo-400">Question {idx + 1} of 5</span>
                      <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-0.5 text-xs font-bold text-indigo-300">{q.score}/100</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{q.question_text}</p>
                    <div className="rounded-xl bg-slate-950/70 p-3.5 text-xs leading-relaxed text-slate-300 border border-white/5">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Your Answer</p>
                      {q.user_answer || <span className="italic text-slate-600">No answer provided.</span>}
                    </div>
                    {q.evaluation_feedback && (
                      <div className="text-xs leading-relaxed text-slate-400 bg-violet-950/15 p-3.5 rounded-xl border border-violet-500/10">
                        <span className="font-bold text-violet-300 block mb-1">AI Feedback</span>
                        {q.evaluation_feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* EXIT ACTIONS */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setView("setup");
                  setSession(null);
                  setCurrentQuestion(null);
                  setChatTranscript([]);
                  setFinalReport(null);
                }}
                className="btn-primary"
              >
                Start New Session
              </button>
              <Link to="/dashboard" className="btn-secondary">
                Back to Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW PAST REPORT MODAL */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-[32px] border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-6 custom-scrollbar"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">{selectedSession.session.interview_type} Interview Report</h3>
                <p className="text-xs text-slate-400">Completed on {new Date(selectedSession.session.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6">
              {/* Score ring and Summary */}
              <div className="grid gap-6 items-center sm:grid-cols-[140px_1fr] bg-slate-950/40 p-5 rounded-2xl border border-white/5">
                <ProgressRing value={selectedSession.session.overall_score} size={130} strokeWidth={10} accent="#8b5cf6" />
                <div className="space-y-2">
                  <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${getDifficultyColor(selectedSession.session.difficulty)}`}>
                    {selectedSession.session.difficulty} Difficulty
                  </span>
                  <p className="text-xs font-semibold text-slate-400 block uppercase">Executive Summary</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedSession.session.feedback_report?.summary || "No summary text generated."}</p>
                </div>
              </div>

              {/* Strengths & Weaknesses Grids */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-slate-950/20 p-4 space-y-2">
                  <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <Award className="h-4 w-4" /> Strengths
                  </p>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {selectedSession.session.feedback_report?.strengths?.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">✓</span>{item}</li>
                    )) || <li className="italic text-slate-500">None logged</li>}
                  </ul>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-950/20 p-4 space-y-2">
                  <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <AlertTriangle className="h-4 w-4" /> Growth Areas
                  </p>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {selectedSession.session.feedback_report?.weaknesses?.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5"><span className="text-rose-400 mt-0.5">⚠</span>{item}</li>
                    )) || <li className="italic text-slate-500">None logged</li>}
                  </ul>
                </div>

                <div className="rounded-xl border border-white/5 bg-slate-950/20 p-4 space-y-2">
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <Lightbulb className="h-4 w-4" /> Suggestions
                  </p>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {selectedSession.session.feedback_report?.suggestions?.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">💡</span>{item}</li>
                    )) || <li className="italic text-slate-500">None logged</li>}
                  </ul>
                </div>
              </div>

              {/* Transcript */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-white border-b border-white/10 pb-1">Questions Transcript</p>
                <div className="space-y-3">
                  {selectedSession.questions?.map((q, idx) => (
                    <div key={q.id} className="rounded-xl border border-white/5 bg-slate-950/30 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3 text-[10px]">
                        <span className="font-extrabold text-slate-400">Q{idx + 1}</span>
                        <span className="font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{q.score}/100</span>
                      </div>
                      <p className="text-xs font-semibold text-white">{q.question_text}</p>
                      <p className="text-xs text-slate-400 bg-slate-950/80 p-2.5 rounded border border-white/5 leading-relaxed">
                        <span className="block font-bold text-[9px] uppercase text-slate-500 mb-0.5">Answer</span>
                        {q.user_answer || <span className="italic text-slate-600">No answer provided.</span>}
                      </p>
                      {q.evaluation_feedback && (
                        <p className="text-xs text-slate-400 bg-violet-950/10 p-2.5 rounded border border-violet-500/10 leading-relaxed">
                          <span className="block font-bold text-[9px] uppercase text-violet-400 mb-0.5">Feedback</span>
                          {q.evaluation_feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="btn-primary"
              >
                Close Report
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
