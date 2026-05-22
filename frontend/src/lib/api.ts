import axios from "axios";
import type {
  AuthResponse,
  Project,
  Dataset,
  Conversation,
  ConversationMessage,
  SendMessageResponse,
  Prompt,
  Slide,
  User,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>("/api/auth/register", data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>("/api/auth/login", data).then((r) => r.data),
  me: () => api.get<User>("/api/auth/me").then((r) => r.data),
};

// Projects
export const projectsApi = {
  list: () => api.get<Project[]>("/api/projects").then((r) => r.data),
  create: (data: Partial<Project>) =>
    api.post<Project>("/api/projects", data).then((r) => r.data),
  get: (id: number) =>
    api.get<Project>(`/api/projects/${id}`).then((r) => r.data),
  update: (id: number, data: Partial<Project>) =>
    api.put<Project>(`/api/projects/${id}`, data).then((r) => r.data),
  delete: (id: number) =>
    api.delete(`/api/projects/${id}`).then((r) => r.data),
};

// Datasets
export const datasetsApi = {
  upload: (projectId: number, file: File, selectedSheet?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (selectedSheet) form.append("selected_sheet", selectedSheet);
    return api
      .post<Dataset>(`/api/projects/${projectId}/datasets/upload`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  profile: (datasetId: number, selectedSheet?: string) =>
    api
      .post<Dataset>(`/api/datasets/${datasetId}/profile`, null, {
        params: selectedSheet ? { selected_sheet: selectedSheet } : {},
      })
      .then((r) => r.data),
  preview: (datasetId: number) =>
    api
      .get<{ columns: string[]; preview: Record<string, unknown>[]; row_count: number; column_count: number }>(
        `/api/datasets/${datasetId}/preview`
      )
      .then((r) => r.data),
  listByProject: (projectId: number) =>
    api
      .get<Dataset[]>(`/api/projects/${projectId}/datasets`)
      .then((r) => r.data),
};

// Conversations
export const conversationsApi = {
  create: (projectId: number, data: { title?: string; dataset_id?: number }) =>
    api
      .post<Conversation>(`/api/projects/${projectId}/conversations`, data)
      .then((r) => r.data),
  list: (projectId: number) =>
    api
      .get<Conversation[]>(`/api/projects/${projectId}/conversations`)
      .then((r) => r.data),
  sendMessage: (conversationId: number, content: string) =>
    api
      .post<SendMessageResponse>(
        `/api/conversations/${conversationId}/messages`,
        { content }
      )
      .then((r) => r.data),
  generatePrompt: (conversationId: number) =>
    api
      .post<Prompt>(`/api/conversations/${conversationId}/generate-prompt`)
      .then((r) => r.data),
  getMessages: (conversationId: number) =>
    api
      .get<ConversationMessage[]>(
        `/api/conversations/${conversationId}/messages`
      )
      .then((r) => r.data),
};

// Slides
export const slidesApi = {
  buildFromPrompt: (promptId: number) =>
    api
      .post<Slide>(`/api/prompts/${promptId}/build-slide`)
      .then((r) => r.data),
  listByProject: (projectId: number, status?: string) =>
    api
      .get<Slide[]>(`/api/projects/${projectId}/slides`, {
        params: status ? { status } : {},
      })
      .then((r) => r.data),
  get: (slideId: number) =>
    api.get<Slide>(`/api/slides/${slideId}`).then((r) => r.data),
  getHtml: (slideId: number) =>
    api
      .get<string>(`/api/slides/${slideId}/html`, { responseType: "text" })
      .then((r) => r.data),
  regenerate: (slideId: number) =>
    api.post<Slide>(`/api/slides/${slideId}/regenerate`).then((r) => r.data),
  update: (slideId: number, data: Partial<Slide>) =>
    api.put<Slide>(`/api/slides/${slideId}`, data).then((r) => r.data),
  delete: (slideId: number) =>
    api.delete(`/api/slides/${slideId}`).then((r) => r.data),
};
