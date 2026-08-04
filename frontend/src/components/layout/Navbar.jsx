import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, LogOut, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { authApi } from "../../api/client";
import { useUser } from "../../context/UserContext";

export default function Navbar() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const initials =
    user?.full_name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "CA";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Clear local session even if the server call fails.
    } finally {
      setUser(null);
      setIsMenuOpen(false);
      navigate("/");
      setLoggingOut(false);
    }
  };

  return (
    <header className="flex h-20 items-center justify-between border-b border-white/10 bg-slate-950/80 px-5 backdrop-blur-xl sm:px-8">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-violet-900/35">
          C
        </span>
        <div>
          <p className="text-sm font-bold tracking-wide text-white">Carevora AI</p>
          <p className="text-[11px] text-slate-400">Your AI Career Operating System</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-900 hover:text-white"
          aria-label="Notifications"
          type="button"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div
          ref={menuRef}
          className="relative border-l border-white/10 pl-3"
          onMouseEnter={() => setIsMenuOpen(true)}
          onMouseLeave={() => setIsMenuOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-slate-900/80"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-300">
              {initials}
            </span>
            <div className="hidden sm:block text-left">
              <p className="max-w-32 truncate text-sm font-semibold text-white">
                {user?.full_name || "Set up profile"}
              </p>
              <p className="max-w-32 truncate text-xs text-slate-400">{user?.email || "Carevora AI"}</p>
            </div>
            <ChevronDown
              className={`hidden h-4 w-4 text-slate-500 transition-transform duration-200 sm:block ${
                isMenuOpen ? "rotate-180 text-violet-300" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 p-1.5 shadow-xl shadow-black/40 backdrop-blur-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {loggingOut ? "Signing out..." : "Logout"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <span className="hidden rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-300 sm:inline-flex sm:items-center sm:gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          Live
        </span>
      </div>
    </header>
  );
}
