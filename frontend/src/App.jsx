import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/layout/Layout";
import AIChat from "./pages/AIChat";
import Applications from "./pages/Applications";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import JobSearch from "./pages/JobSearch";
import LandingPage from "./pages/LandingPage";
import Profile from "./pages/Profile";
import ResumeUpload from "./pages/ResumeUpload";
import Interview from "./pages/Interview";
import CareerGap from "./pages/CareerGap";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<AuthPage mode="signin" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<JobSearch />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/resume" element={<ResumeUpload />} />
        <Route path="/chat" element={<AIChat />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/career-gap" element={<CareerGap />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
