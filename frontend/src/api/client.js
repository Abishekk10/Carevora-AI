import axios from "axios";

const TOKEN_STORAGE_KEY = "jobpilot-auth-token";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
  withCredentials: true
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || "Something went wrong.";
    return Promise.reject(new Error(message));
  }
);

export const usersApi = {
  create: async (payload) => (await apiClient.post("/api/users", payload)).data.user,
  get: async (userId) => (await apiClient.get(`/api/users/${userId}`)).data.user,
  update: async (userId, payload) => (await apiClient.patch(`/api/users/${userId}`, payload)).data.user
};

export const resumesApi = {
  upload: async (userId, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(`/api/users/${userId}/resumes`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress,
      // PDF extraction and Gemini analysis can take longer than ordinary API calls.
      timeout: 90_000
    });
    return response.data.resume;
  },
  remove: async (resumeId) => apiClient.delete(`/api/resumes/${resumeId}`),
  downloadUrl: (resumeId) => `${import.meta.env.VITE_API_BASE_URL || ""}/api/resumes/${resumeId}/download`
};

export const jobsApi = {
  search: async (payload) => (await apiClient.post("/api/jobs/search", payload)).data,
  match: async (resumeId, jobId) => (await apiClient.post("/api/jobs/match", { resume_id: resumeId, job_id: jobId }, { timeout: 90_000 })).data.match
};

export const chatApi = {
  send: async (message) => (await apiClient.post("/api/chat", { message })).data.response,
  rag: async (question, userId) => (await apiClient.post("/api/chat/rag", { question, user_id: userId }, { timeout: 90_000 })).data
};

export const dashboardApi = {
  get: async () => (await apiClient.get("/api/dashboard")).data
};

export const authApi = {
  register: async (payload) =>
    (await apiClient.post("/api/auth/register", payload)).data,

  login: async (payload) =>
    (await apiClient.post("/api/auth/login", payload)).data,

  logout: async () =>
    (await apiClient.post("/api/auth/logout")).data,

  me: async () =>
    (await apiClient.get("/api/auth/me")).data.user
};

export const interviewApi = {
  getHistory: async () => (await apiClient.get("/api/interview/history")).data.sessions,
  startSession: async (payload) => (await apiClient.post("/api/interview/start", payload, { timeout: 90_000 })).data,
  submitAnswer: async (payload) => (await apiClient.post("/api/interview/answer", payload, { timeout: 95_000 })).data,
  getSessionDetails: async (sessionId) => (await apiClient.get(`/api/interview/session/${sessionId}`)).data,
  getLatestScore: async () => (await apiClient.get("/api/interview/latest")).data,
  checkResume: async () => (await apiClient.get("/api/interview/check-resume")).data,
};

export const applicationsApi = {
  getAll: async () => (await apiClient.get("/api/applications")).data.applications,
  create: async (payload) => (await apiClient.post("/api/applications", payload)).data.application,
  update: async (appId, payload) => (await apiClient.patch(`/api/applications/${appId}`, payload)).data.application,
  delete: async (appId) => await apiClient.delete(`/api/applications/${appId}`),
  getStats: async () => (await apiClient.get("/api/applications/stats")).data,
};
