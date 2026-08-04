import { useEffect, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, Edit2, ExternalLink, Plus, Trash2, X } from "lucide-react";
import { applicationsApi } from "../api/client";

const STATUS_OPTIONS = ["Saved", "Applied", "Online Assessment", "Interview", "Offer", "Rejected"];

const STATUS_COLORS = {
  "Saved": "bg-slate-500/20 text-slate-300 border-slate-500/30",
  "Applied": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Online Assessment": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Interview": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "Offer": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Rejected": "bg-rose-500/20 text-rose-300 border-rose-500/30"
};

function formatDate(dateString) {
  if (!dateString) return "Not set";
  try {
    return new Date(dateString).toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
  } catch {
    return dateString;
  }
}

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [formData, setFormData] = useState({
    company_name: "",
    job_title: "",
    status: "Saved",
    application_date: "",
    notes: "",
    job_link: ""
  });

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await applicationsApi.getAll();
      setApplications(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingApp(null);
    setFormData({
      company_name: "",
      job_title: "",
      status: "Saved",
      application_date: new Date().toISOString().split('T')[0],
      notes: "",
      job_link: ""
    });
    setShowModal(true);
  };

  const openEditModal = (app) => {
    setEditingApp(app);
    setFormData({
      company_name: app.company_name,
      job_title: app.job_title,
      status: app.status,
      application_date: app.application_date ? app.application_date.split('T')[0] : "",
      notes: app.notes || "",
      job_link: app.job_link || ""
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingApp) {
        await applicationsApi.update(editingApp.id, formData);
      } else {
        await applicationsApi.create(formData);
      }
      setShowModal(false);
      loadApplications();
    } catch (err) {
      setError(err.message || "Failed to save application");
    }
  };

  const handleDelete = async (appId) => {
    if (!confirm("Are you sure you want to delete this application?")) return;
    try {
      await applicationsApi.delete(appId);
      loadApplications();
    } catch (err) {
      setError(err.message || "Failed to delete application");
    }
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await applicationsApi.update(appId, { status: newStatus });
      loadApplications();
    } catch (err) {
      setError(err.message || "Failed to update status");
    }
  };

  if (loading) {
    return (
      <section className="animate-fade-up">
        <div className="h-40 animate-pulse rounded-[32px] bg-slate-800/80" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-[24px] bg-slate-800/80" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-up">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">Track your job applications through every stage.</p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Application
        </button>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="surface mt-6 py-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-800">
            <CheckCircle2 className="h-8 w-8 text-slate-600" />
          </div>
          <h2 className="mt-4 font-semibold text-slate-800">No applications yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            Start tracking your job applications by adding your first one.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {applications.map((app) => (
            <article
              key={app.id}
              className="surface group p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-18px_rgba(99,102,241,0.7)]"
            >
              <div className="flex gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-sm font-bold text-violet-200 ring-1 ring-white/10">
                  {app.company_name?.slice(0, 1)?.toUpperCase() || "C"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-white">{app.job_title}</h3>
                      <p className="mt-0.5 text-sm text-slate-300">{app.company_name}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[app.status] || STATUS_COLORS["Saved"]}`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-300">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Applied: {formatDate(app.application_date)}
                    </span>
                    {app.job_link && (
                      <a
                        href={app.job_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-indigo-200"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Job link
                      </a>
                    )}
                  </div>

                  {app.notes && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                      {app.notes}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="rounded-lg border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => openEditModal(app)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(app.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="surface w-full max-w-lg rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editingApp ? "Edit Application" : "Add Application"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="field"
                  placeholder="e.g., Google"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  className="field"
                  placeholder="e.g., Software Engineer"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="field"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Application Date
                  </label>
                  <input
                    type="date"
                    value={formData.application_date}
                    onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                    className="field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Job Link
                </label>
                <input
                  type="url"
                  value={formData.job_link}
                  onChange={(e) => setFormData({ ...formData, job_link: e.target.value })}
                  className="field"
                  placeholder="https://company.com/job-posting"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="field min-h-[80px] resize-y"
                  placeholder="Add any notes about this application..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  {editingApp ? "Update" : "Add"} Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
