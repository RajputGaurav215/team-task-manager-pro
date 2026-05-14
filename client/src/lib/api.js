const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  return localStorage.getItem('teamflow_token');
}

export function setToken(token) {
  localStorage.setItem('teamflow_token', token);
}

export function clearToken() {
  localStorage.removeItem('teamflow_token');
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || 'Request failed.';
    const details = data?.errors?.map((err) => `${err.field}: ${err.message}`).join(', ');
    throw new Error(details || message);
  }
  return data;
}
