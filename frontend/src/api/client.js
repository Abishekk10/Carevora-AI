import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  headers: { "Content-Type": "application/json" },
  timeout: 20_000
});

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
  search: async (payload) => (await apiClient.post("/api/jobs/search", payload)).data
};

export const chatApi = {
  send: async (message) => (await apiClient.post("/api/chat", { message })).data.response
};
