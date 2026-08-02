import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/layout/Layout";
import AIChat from "./pages/AIChat";
import Dashboard from "./pages/Dashboard";
import JobSearch from "./pages/JobSearch";
import Profile from "./pages/Profile";
import ResumeUpload from "./pages/ResumeUpload";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<JobSearch />} />
        <Route path="/resume" element={<ResumeUpload />} />
        <Route path="/chat" element={<AIChat />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
