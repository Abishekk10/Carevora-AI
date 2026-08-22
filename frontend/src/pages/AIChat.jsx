import { AlertCircle, ArrowUp, Bot, Sparkles, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { chatApi } from "../api/client";
import ChatMessage from "../components/chat/ChatMessage";
import { useUser } from "../context/UserContext";

const initialMessage = {
  role: "assistant",
  content:
    "👋 I'm Carevora AI, your intelligent career copilot—ask me anything about jobs, resumes, interviews, ATS optimization, career growth, or learning paths.",
};

export default function AIChat() {
  const { user } = useUser();

  const [messages, setMessages] = useState([initialMessage]);
  const [draft, setDraft] = useState("");
  const [isStreaming, setStreaming] = useState(false);
  const [error, setError] = useState("");

  const endRef = useRef(null);
  const abortRef = useRef(null);
  const partialTextRef = useRef("");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const patchLastAssistant = (patch) => {
    setMessages((current) => {
      const next = [...current];
      for (let index = next.length - 1; index >= 0; index -= 1) {
        if (next[index].role === "assistant") {
          next[index] = { ...next[index], ...patch };
          break;
        }
      }
      return next;
    });
  };

  const send = async (event) => {
    event.preventDefault();

    const content = draft.trim();

    if (!content || isStreaming) return;

    setMessages((current) => [...current, { role: "user", content }]);
    setDraft("");
    setError("");
    setMessages((current) => [...current, { role: "assistant", content: "" }]);
    partialTextRef.current = "";
    setStreaming(true);

    try {
      if (!user?.id) {
        const answer = await chatApi.send(content);
        patchLastAssistant({ content: answer });
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      await chatApi.stream(content, user.id, {
        signal: controller.signal,
        onChunk: (delta) => {
          partialTextRef.current += delta;
          patchLastAssistant({ content: partialTextRef.current });
        },
      });
    } catch (requestError) {
      if (requestError.name === "AbortError") {
        patchLastAssistant({
          content: partialTextRef.current
            ? `${partialTextRef.current}\n\n_(stopped)_`
            : "_(stopped)_",
        });
      } else if (!partialTextRef.current) {
        patchLastAssistant({ content: `⚠️ ${requestError.message}` });
      } else {
        setError(requestError.message);
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  return (
    <section className="animate-fade-up flex min-h-[calc(100vh-9rem)] flex-col">
      <div>
        <h1 className="page-title">Carevora AI Assistant</h1>

        <p className="page-subtitle">
          Your intelligent career companion for jobs, resumes, interviews,
          career planning, ATS optimization, and professional growth.
        </p>
      </div>

      <div className="surface mt-6 flex min-h-[560px] flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-indigo-500/15 to-violet-500/15 px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500 text-white">
            <Bot className="h-5 w-5" />
          </span>

          <div>
            <h2 className="text-sm font-bold text-white">
              Carevora AI
            </h2>

            <p className={`text-xs ${isStreaming ? "text-amber-300" : "text-emerald-300"}`}>
              {isStreaming ? "🟡 Generating answer…" : "🟢 Online • Ready to assist"}
            </p>
          </div>

          <Sparkles className="ml-auto h-5 w-5 text-indigo-300" />
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto bg-slate-950/40 p-5">
          {messages.map((message, index) => (
            <ChatMessage
              key={`${message.role}-${index}`}
              message={message}
            />
          ))}

          {error && (
            <div className="flex gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}

          <div ref={endRef} />
        </div>

        <form
          onSubmit={send}
          className="border-t border-white/10 bg-slate-950/70 p-4"
        >
          <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-2 focus-within:border-indigo-500">
            <textarea
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-400"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  send(event);
                }
              }}
              placeholder="Ask Carevora AI anything..."
              aria-label="Chat message"
            />

            {isStreaming ? (
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-700 text-white transition hover:bg-slate-600"
                onClick={stop}
                aria-label="Stop generating"
                title="Stop generating"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-50"
                disabled={!draft.trim() || isStreaming}
                aria-label="Send message"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            )}
          </div>

          <p className="mt-2 px-2 text-xs text-slate-400">
            {isStreaming
              ? "Streaming your answer — press stop to interrupt"
              : "Press Enter to send • Shift + Enter for a new line"}
          </p>
        </form>
      </div>
    </section>
  );
}
