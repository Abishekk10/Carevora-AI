import { Bot, BriefcaseBusiness, FileUp, LayoutDashboard, Menu, UserRound, X, GraduationCap, CheckSquare, ChartNoAxesCombined } from "lucide-react";
import { NavLink } from "react-router-dom";

const navigation = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/jobs", "Job search", BriefcaseBusiness],
  ["/applications", "Applications", CheckSquare],
  ["/resume", "Resume", FileUp],
  ["/interview", "AI Interview", GraduationCap],
  ["/career-gap", "Career Gap", ChartNoAxesCombined],
  ["/chat", "AI chat", Bot],
  ["/profile", "Profile", UserRound]
];

function NavItems({ onNavigate }) {
  return navigation.map(([to, label, Icon]) => (
    <NavLink
      key={to}
      to={to}
      onClick={onNavigate}
      className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        isActive ? "bg-violet-500/15 text-violet-300" : "text-slate-300 hover:bg-slate-900 hover:text-white"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  ));
}

export default function Sidebar({ isOpen, onClose, onOpen }) {
  return (
    <>
      <button className="fixed left-4 top-4 z-30 rounded-xl bg-slate-900 p-2 text-white lg:hidden" onClick={onOpen} aria-label="Open navigation">
        <Menu className="h-5 w-5" />
      </button>
      {isOpen && <button className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-slate-950/95 p-5 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <NavLink to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-violet-900/35">C</span>
            <span className="text-lg font-bold tracking-tight text-white">Carevora AI</span>
          </NavLink>
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 lg:hidden" onClick={onClose} aria-label="Close navigation"><X className="h-5 w-5" /></button>
        </div>
        <nav className="mt-10 space-y-1"><NavItems onNavigate={onClose} /></nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-slate-200">
          <Bot className="h-5 w-5 text-indigo-300" />
          <p className="mt-3 text-sm font-semibold text-white">Your AI career copilot</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Discover roles and turn your next move into momentum.</p>
        </div>
      </aside>
    </>
  );
}
