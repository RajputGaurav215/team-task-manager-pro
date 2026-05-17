const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_BASE = isLocalhost
  ? import.meta.env.VITE_API_URL || "http://localhost:5000/api"
  : "/api";

export function getToken() {
  return localStorage.getItem("teamflow_token");
}

export function setToken(token) {
  localStorage.setItem("teamflow_token", token);
}

export function clearToken() {
  localStorage.removeItem("teamflow_token");
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.details ||
      "Request failed. Please try again.";

    throw new Error(
      Array.isArray(message)
        ? message.map((item) => item.message || item).join(", ")
        : message,
    );
  }

  return data;
}

export const authAPI = {
  signup: (data) =>
    api("/auth/signup", {
      method: "POST",
      body: {
        name: data.name,
        email: data.email,
        password: data.password,
      },
    }),

  login: (data) =>
    api("/auth/login", {
      method: "POST",
      body: {
        email: data.email,
        password: data.password,
      },
    }),

  forgotPassword: (data) =>
    api("/auth/forgot-password", {
      method: "POST",
      body: {
        email: data.email,
      },
    }),

  resetPassword: (data) =>
    api("/auth/reset-password", {
      method: "POST",
      body: {
        token: data.token,
        password: data.password,
      },
    }),
};

export const projectAPI = {
  getAll: () => api("/projects"),

  getById: (projectId) => api(`/projects/${projectId}`),

  create: (data) =>
    api("/projects", {
      method: "POST",
      body: data,
    }),

  update: (projectId, data) =>
    api(`/projects/${projectId}`, {
      method: "PUT",
      body: data,
    }),

  delete: (projectId) =>
    api(`/projects/${projectId}`, {
      method: "DELETE",
    }),

  join: (inviteCode) =>
    api("/projects/join", {
      method: "POST",
      body: {
        inviteCode,
      },
    }),

  addMember: (projectId, data) =>
    api(`/projects/${projectId}/members`, {
      method: "POST",
      body: data,
    }),

  removeMember: (projectId, userId) =>
    api(`/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
    }),
};

export const taskAPI = {
  getAll: (projectId) => {
    const query = projectId ? `?projectId=${projectId}` : "";
    return api(`/tasks${query}`);
  },

  getById: (taskId) => api(`/tasks/${taskId}`),

  create: (data) =>
    api("/tasks", {
      method: "POST",
      body: data,
    }),

  update: (taskId, data) =>
    api(`/tasks/${taskId}`, {
      method: "PUT",
      body: data,
    }),

  delete: (taskId) =>
    api(`/tasks/${taskId}`, {
      method: "DELETE",
    }),

  updateStatus: (taskId, status) =>
    api(`/tasks/${taskId}`, {
      method: "PUT",
      body: {
        status,
      },
    }),
};

export const dashboardAPI = {
  getStats: () => api("/dashboard"),
};

export const healthAPI = {
  check: () => api("/health"),
};
