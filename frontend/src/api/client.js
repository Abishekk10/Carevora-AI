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

function extractErrorMessage(error) {
  const data = error?.response?.data;
  if (data && typeof data === "object" && data.error != null) {
    const err = data.error;
    if (typeof err === "string") return err;
    const nested = err?.message || err?.msg || err?.detail || err?.description;
    if (typeof nested === "string" && nested) return nested;
    try {
      return JSON.stringify(err);
    } catch {
      // fall through to the default message below
    }
  }
  return error?.message || "Something went wrong.";
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(new Error(extractErrorMessage(error)));
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
  // Live provider lookups can legitimately take up to a minute on the first
  // search while the provider and the embedding model initialize.
  search: async (payload) => (await apiClient.post("/api/jobs/search", payload, { timeout: 60_000 })).data,
  match: async (resumeId, jobId) => (await apiClient.post("/api/jobs/match", { resume_id: resumeId, job_id: jobId }, { timeout: 90_000 })).data.match
};

export const chatApi = {
  send: async (message) => (await apiClient.post("/api/chat", { message })).data.response,
  rag: async (question, userId) => (await apiClient.post("/api/chat/rag", { question, user_id: userId }, { timeout: 90_000 })).data,
  // Streams a RAG-grounded answer via Server-Sent Events. Resolves when the
  // stream finishes; rejects with Error("Aborted") if the caller aborts.
  stream: (question, userId, { signal, onChunk } = {}) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const baseURL = import.meta.env.VITE_API_BASE_URL || "";
    const controller = new AbortController();
    const abort = () => controller.abort();

    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener("abort", abort, { once: true });
    }

    return fetch(`${baseURL}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ question, user_id: userId }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          let message = "Something went wrong.";
          try {
            const data = await response.json();
            if (data?.error != null) {
              message =
                typeof data.error === "string" ? data.error : JSON.stringify(data.error);
            }
          } catch {
            // fall back to the generic message
          }
          throw new Error(message);
        }
        if (!response.body) {
          throw new Error("This browser does not support streaming responses.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const finish = () => {
          signal?.removeEventListener("abort", abort);
        };

        const consume = (resolve, reject) => {
          reader.read().then(
            ({ done, value }) => {
              if (done) {
                finish();
                resolve();
                return;
              }
              buffer += decoder.decode(value, { stream: true });
              const events = buffer.split("\n\n");
              buffer = events.pop();
              for (const event of events) {
                const dataLine = event
                  .split("\n")
                  .find((line) => line.startsWith("data:"));
                if (!dataLine) continue;
                let payload;
                try {
                  payload = JSON.parse(dataLine.slice(5));
                } catch {
                  continue;
                }
                if (payload.error) {
                  finish();
                  reader.cancel();
                  reject(new Error(payload.error));
                  return;
                }
                if (typeof payload.text === "string") onChunk?.(payload.text);
                if (payload.done) {
                  finish();
                  reader.cancel();
                  resolve();
                  return;
                }
              }
              consume(resolve, reject);
            },
            (readError) => {
              if (readError?.name === "AbortError") {
                finish();
                reject(new DOMException("Aborted", "AbortError"));
              } else {
                finish();
                reject(readError);
              }
            }
          );
        };

        return new Promise((resolve, reject) => consume(resolve, reject));
      })
      .catch((error) => {
        signal?.removeEventListener("abort", abort);
        if (error?.name === "AbortError") {
          throw new DOMException("Aborted", "AbortError");
        }
        throw error;
      });
  },
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
