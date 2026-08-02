import { Bell, ChevronDown, UserRound } from "lucide-react";
import { useUser } from "../../context/UserContext";

export default function Navbar() {
  const { user } = useUser();
  const initials = user?.full_name?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "JP";

  return (
    <header className="flex h-20 items-center justify-end border-b border-slate-200 bg-white px-5 sm:px-8">
      <div className="flex items-center gap-3">
        <button className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Notifications"><Bell className="h-5 w-5" /></button>
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{initials}</span>
          <div className="hidden sm:block"><p className="max-w-32 truncate text-sm font-semibold text-slate-800">{user?.full_name || "Set up profile"}</p><p className="max-w-32 truncate text-xs text-slate-500">{user?.email || "JobPilot"}</p></div>
          <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
        </div>
      </div>
    </header>
  );
}
