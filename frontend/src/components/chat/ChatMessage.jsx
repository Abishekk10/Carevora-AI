import { Bot, UserRound } from "lucide-react";

export default function ChatMessage({ message }) {
  const isAssistant = message.role === "assistant";
  return (
    <div className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}>
      {isAssistant && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white"><Bot className="h-4 w-4" /></span>}
      <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[70%] ${isAssistant ? "rounded-tl-sm bg-white text-slate-700 shadow-sm ring-1 ring-slate-200" : "rounded-tr-sm bg-indigo-600 text-white"}`}>{message.content}</div>
      {!isAssistant && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-200 text-slate-600"><UserRound className="h-4 w-4" /></span>}
    </div>
  );
}
