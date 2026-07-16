import { getToken } from "./client";
import { getPrimaryDashboardRole } from "../utils/userDestination";

// Base URL of the standalone Medora AI microservice (FastAPI). All AI logic
// lives there; the frontend never imports or runs AI logic locally.
export const AI_SERVICE_URL = (import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8100").replace(/\/$/, "");

// Shown when the AI service returns an error while running (e.g. model down).
export const AI_FALLBACK_MESSAGE = "عذرًا، المساعد الذكي غير متاح حاليًا. حاول مرة أخرى لاحقًا.";

// Shown when the AI service itself is stopped/unreachable (systemd service off).
export const AI_MAINTENANCE_MESSAGE = {
  en: "AI consultation service is currently unavailable.\nPlease try again later.",
  ar: "خدمة الاستشارة الذكية غير متاحة حاليًا.\nمن فضلك حاول مرة أخرى لاحقًا.",
};

export function getChatRole(user) {
  return getPrimaryDashboardRole(user) || "guest";
}

async function postChat({ message, user, conversationId, attachedImage, token }) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetch(`${AI_SERVICE_URL}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      user_id: token ? (user?.id ?? user?.userId ?? null) : null,
      role: token ? getChatRole(user) : "guest",
      conversation_id: conversationId ?? null,
      attached_image: attachedImage ?? null,
    }),
  });
}

/**
 * Send a message to the AI service and get the assistant reply.
 *
 * @param {Object} params
 * @param {string} params.message       - user message text
 * @param {Object|null} params.user     - authenticated user (or null for guest)
 * @param {string|null} params.conversationId
 * @param {string|null} params.attachedImage - base64 data URL (optional)
 * @returns {Promise<{response: string, conversation_id: string, metadata: object}>}
 */
export async function sendAiMessage({ message, user, conversationId, attachedImage }) {
  const token = getToken();

  let res;
  try {
    res = await postChat({ message, user, conversationId, attachedImage, token });
  } catch (networkError) {
    // The service is stopped/unreachable (e.g. systemd service is off).
    const error = new Error("AI service unreachable");
    error.serviceDown = true;
    error.cause = networkError;
    throw error;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if ((res.status === 401 || res.status === 403) && token) {
    try {
      res = await postChat({ message, user: null, conversationId: null, attachedImage, token: null });
      data = await res.json().catch(() => null);
    } catch (networkError) {
      const error = new Error("AI service unreachable");
      error.serviceDown = true;
      error.cause = networkError;
      throw error;
    }
  }

  if (!res.ok) {
    const error = new Error(data?.detail || "AI request failed");
    error.status = res.status;
    error.data = data;
    // 502/503/504 from a proxy also mean the upstream service is down.
    error.serviceDown = [502, 503, 504].includes(res.status);
    throw error;
  }

  return data;
}

export async function deleteAiConversation(conversationId) {
  if (!conversationId) return;

  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${AI_SERVICE_URL}/conversation/${encodeURIComponent(conversationId)}`, {
      method: "DELETE",
      headers,
    });
  } catch (networkError) {
    const error = new Error("AI service unreachable");
    error.serviceDown = true;
    error.cause = networkError;
    throw error;
  }

  if (res.status === 404) return;
  if (!res.ok) {
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    const error = new Error(data?.detail || "AI delete request failed");
    error.status = res.status;
    error.data = data;
    error.serviceDown = [502, 503, 504].includes(res.status);
    throw error;
  }
}

/**
 * Read a medicine photo via the AI service OCR and return the recognized name.
 *
 * @param {Object} params
 * @param {string} params.image - base64 image data URL
 * @returns {Promise<{query: string, recognized: boolean}>}
 */
export async function scanMedicineImage({ image }) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${AI_SERVICE_URL}/ocr/medicine`, {
      method: "POST",
      headers,
      body: JSON.stringify({ image }),
    });
  } catch (networkError) {
    const error = new Error("AI service unreachable");
    error.serviceDown = true;
    error.cause = networkError;
    throw error;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const error = new Error(data?.detail || "OCR request failed");
    error.status = res.status;
    error.serviceDown = [502, 503, 504].includes(res.status);
    throw error;
  }

  return data;
}

// Read a File/Blob as a base64 data URL.
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
