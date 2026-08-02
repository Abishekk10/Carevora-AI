import { AlertCircle, ArrowUp, Bot, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { chatApi } from "../api/client";
import ChatMessage from "../components/chat/ChatMessage";

const initialMessage = { role: "assistant", content: "I’m JobPilot AI. Ask me about your job search, resume, interview preparation, or career direction." };

export default function AIChat() {
  const [messages, setMessages] = useState([initialMessage]);
  const [draft, setDraft] = useState("");
  const [isSending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, isSending]);
  const send = async (event) => { event.preventDefault(); const content = draft.trim(); if (!content || isSending) return; setMessages((current) => [...current, { role: "user", content }]); setDraft(""); setSending(true); setError(""); try { const response = await chatApi.send(content); setMessages((current) => [...current, { role: "assistant", content: response }]); } catch (requestError) { setError(requestError.message); } finally { setSending(false); } };
  return <section className="animate-fade-up flex min-h-[calc(100vh-9rem)] flex-col"><div><h1 className="page-title">AI career copilot</h1><p className="page-subtitle">Thoughtful career guidance, whenever you need a second brain.</p></div><div className="surface mt-6 flex min-h-[560px] flex-1 flex-col overflow-hidden"><div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white"><Bot className="h-5 w-5" /></span><div><h2 className="text-sm font-bold text-slate-900">JobPilot AI</h2><p className="text-xs text-emerald-600">Ready to help</p></div><Sparkles className="ml-auto h-5 w-5 text-indigo-400" /></div><div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/60 p-5">{messages.map((message, index) => <ChatMessage key={`${message.role}-${index}`} message={message} />)}{isSending && <ChatMessage message={{ role: "assistant", content: "Thinking through that…" }} />}{error && <div className="flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}<div ref={endRef} /></div><form onSubmit={send} className="border-t border-slate-100 bg-white p-4"><div className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-500"><textarea className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400" value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) send(event); }} placeholder="Ask about your career…" aria-label="Chat message" /><button className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-50" disabled={!draft.trim() || isSending} aria-label="Send message"><ArrowUp className="h-5 w-5" /></button></div><p className="mt-2 px-2 text-xs text-slate-400">Press Enter to send · Shift + Enter for a new line</p></form></div></section>;
}
