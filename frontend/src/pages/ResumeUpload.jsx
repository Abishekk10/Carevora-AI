import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { resumesApi } from "../api/client";
import ResumeCard from "../components/resume/ResumeCard";
import ResumeIntelligenceCard from "../components/resume/ResumeIntelligenceCard";
import { useUser } from "../context/UserContext";

export default function ResumeUpload() {
  const { user } = useUser();

  const inputRef = useRef(null);

  const [resume, setResume] = useState(null);
  const [isDragging, setDragging] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [isDeleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load only the currently logged-in user's locally stored resume.
  useEffect(() => {
    if (!user?.id) {
      setResume(null);
      return;
    }

    const resumeKey = `jobpilot-current-resume-${user.id}`;
    const storedResume = localStorage.getItem(resumeKey);

    if (!storedResume) {
      setResume(null);
      return;
    }

    try {
      setResume(JSON.parse(storedResume));
    } catch {
      localStorage.removeItem(resumeKey);
      setResume(null);
    }
  }, [user?.id]);

  const saveResume = (nextResume) => {
    setResume(nextResume);

    if (!user?.id) return;

    const resumeKey = `jobpilot-current-resume-${user.id}`;

    if (nextResume) {
      localStorage.setItem(
        resumeKey,
        JSON.stringify(nextResume)
      );
    } else {
      localStorage.removeItem(resumeKey);
    }
  };

  const upload = async (file) => {
    if (!file || isUploading) return;

    if (!user) {
      setError(
        "Create your profile before uploading a resume."
      );
      return;
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setError("Please choose a PDF resume.");
      return;
    }

    setError("");
    setSuccess("");
    setProgress(0);
    setUploading(true);

    try {
      const uploadedResume = await resumesApi.upload(
        user.id,
        file,
        (event) => {
          if (event.total) {
            setProgress(
              Math.round(
                (event.loaded * 100) / event.total
              )
            );
          }
        }
      );

      saveResume(uploadedResume);
      setProgress(100);

      setSuccess(
        uploadedResume.intelligence?.status === "failed"
          ? "Resume uploaded, but AI analysis could not be completed."
          : "Resume uploaded and analyzed successfully."
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const remove = async () => {
    if (
      !resume ||
      !window.confirm("Delete this resume?")
    ) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await resumesApi.remove(resume.id);

      saveResume(null);

      setSuccess("Resume deleted.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="animate-fade-up">
      <h1 className="page-title">
        Resume intelligence
      </h1>

      <p className="page-subtitle">
        Upload a PDF resume to build a structured,
        AI-ready career profile.
      </p>

      {!user && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <span>
            Set up a profile before uploading so your
            resume stays connected to your JobPilot
            account.{" "}

            <Link
              to="/profile"
              className="font-semibold underline"
            >
              Create profile
            </Link>
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 flex gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-6 flex gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (
            event.currentTarget === event.target
          ) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);

          upload(event.dataTransfer.files[0]);
        }}
        className={`mt-7 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${
          isDragging
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-white/10 bg-slate-900/60 hover:border-indigo-300 hover:bg-slate-900"
        }`}
        onClick={() =>
          !isUploading &&
          inputRef.current?.click()
        }
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !isUploading
          ) {
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="application/pdf,.pdf"
          onClick={(event) =>
            event.stopPropagation()
          }
          onChange={(event) =>
            upload(event.target.files?.[0])
          }
        />

        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/15 text-indigo-300">
          <UploadCloud className="h-7 w-7" />
        </span>

        <h2 className="mt-5 font-semibold text-white">
          {isUploading
            ? "Uploading and analyzing your resume…"
            : "Drop your resume here"}
        </h2>

        <p className="mt-2 text-sm text-slate-300">
          or click to browse. PDF files up to 10 MB.
        </p>

        {isUploading && (
          <div className="mx-auto mt-5 max-w-sm">
            <div className="h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-indigo-400 transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs font-medium text-slate-300">
              {progress}% uploaded
            </p>
          </div>
        )}

        <span className="btn-primary pointer-events-none mt-5">
          <FileUp className="h-4 w-4" />
          Choose PDF
        </span>
      </div>

      {resume && (
        <div className="mt-8 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">
              Current resume
            </h2>

            <div className="mt-3">
              <ResumeCard
                resume={resume}
                onDelete={remove}
                deleting={isDeleting}
              />
            </div>

            {resume.intelligence?.status ===
              "failed" && (
              <p className="mt-3 text-sm text-amber-200">
                AI analysis failed:{" "}
                {resume.intelligence
                  .error_message ||
                  "Please try uploading again later."}
              </p>
            )}
          </div>

          <ResumeIntelligenceCard
            intelligence={resume.intelligence}
          />
        </div>
      )}
    </section>
  );
}