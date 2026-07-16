export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

const TOKEN_KEY = "medora_token";
const USER_KEY = "medora_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(auth) {
  if (auth?.token) localStorage.setItem(TOKEN_KEY, auth.token);
  if (auth) localStorage.setItem(USER_KEY, JSON.stringify(auth));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function decodeJwtPayload(token) {
  try {
    const payload = token?.split(".")?.[1];
    if (!payload || typeof window === "undefined") return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function isStoredSessionExpired(session) {
  const explicitExpiry = Date.parse(session?.expiresAtUtc || session?.expiresAt || "");
  if (Number.isFinite(explicitExpiry) && explicitExpiry <= Date.now()) return true;

  const jwtPayload = decodeJwtPayload(session?.token);
  return Number.isFinite(jwtPayload?.exp) && jwtPayload.exp * 1000 <= Date.now();
}

function handleUnauthorized(path, status) {
  if (typeof window === "undefined") return;
  if (path.startsWith("/api/account/login")) return;
  if (path.startsWith("/api/account/logout")) return;
  if (path.startsWith("/api/account/register")) return;
  if (path.startsWith("/api/account/verify")) return;
  if (path.startsWith("/api/account/forgotPassword")) return;

  const wasAuthenticated = !!getToken();
  clearSession();
  if (wasAuthenticated) {
    try {
      sessionStorage.setItem("medora_session_expired", "1");
    } catch {
      // ignore storage errors
    }
  }
  window.dispatchEvent(new CustomEvent("medora:auth-expired", { detail: { path, status, wasAuthenticated } }));

  if (
    window.location.pathname.startsWith("/admin") ||
    window.location.pathname.startsWith("/doctor") ||
    window.location.pathname.startsWith("/pharmacy")
  ) {
    window.location.replace("/sign-in");
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isStoredSessionExpired(parsed)) {
      clearSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  return text ? { message: text } : null;
}

export async function apiRequest(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;
  const wantsBlob = options.responseType === "blob";

  if (!isFormData && options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: isFormData || typeof options.body === "string" || options.body === undefined ? options.body : JSON.stringify(options.body),
  });

  if (wantsBlob) {
    if (!response.ok) {
      const data = await parseResponse(response);
      if (response.status === 401 || response.status === 403) {
        handleUnauthorized(path, response.status);
      }

      const message =
        response.status === 401
          ? "Your session has expired. Please sign in again."
          : response.status === 403
            ? "You do not have permission to perform this action."
            : data?.message || data?.title || "Request failed";
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return {
      blob: await response.blob(),
      filename: response.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/i)?.[1] || "download",
      contentType: response.headers.get("content-type") || "application/octet-stream",
    };
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(path, response.status);
    }

    const message =
      response.status === 401
        ? "Your session has expired. Please sign in again."
        : response.status === 403
          ? "You do not have permission to perform this action."
          : data?.message || data?.title || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (path, options = {}) => apiRequest(path, options),
  getBlob: (path) => apiRequest(path, { responseType: "blob" }),
  post: (path, body, options = {}) => apiRequest(path, { ...options, method: "POST", body }),
  put: (path, body, options = {}) => apiRequest(path, { ...options, method: "PUT", body }),
  delete: (path, options = {}) => apiRequest(path, { ...options, method: "DELETE" }),
};
