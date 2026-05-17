const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_BASE = isLocalhost
  ? import.meta.env.VITE_API_URL || "http://localhost:5000/api"
  : `${window.location.origin}/api`;

function normalizePath(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

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
  const url = `${API_BASE}${normalizePath(path)}`;

  const headers = new Headers(options.headers || {});
  const token = getToken();

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    console.error("API Network Error:", {
      url,
      error,
    });

    throw new Error(
      `Failed to connect to server. Please check API URL: ${url}`
    );
  }

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
        : message
    );
  }

  return data;
}

/* =========================
   AUTH API
========================= */

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

/* =========================
   PROJECT API
========================= */

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

/* =========================
   TASK API
========================= */

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

/* =========================
   DASHBOARD API
========================= */

export const dashboardAPI = {
  getStats: () => api("/dashboard"),
};

/* =========================
   HEALTH API
========================= */

export const healthAPI = {
  check: () => api("/health"),
};