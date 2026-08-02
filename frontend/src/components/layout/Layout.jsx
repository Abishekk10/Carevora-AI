import { Outlet } from "react-router-dom";
import { useState } from "react";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} onOpen={() => setSidebarOpen(true)} />
      <div className="lg:pl-72"><Navbar /><main className="mx-auto max-w-7xl p-5 pt-8 sm:p-8"><Outlet /></main></div>
    </div>
  );
}
