const STORAGE_PREFIX = "medora_ai_chats_v1";
const GUEST_STORAGE_KEY = `${STORAGE_PREFIX}:guest`;
export const AI_CHATS_UPDATED_EVENT = "medora:ai-chats-updated";

export function getAiChatUserKey(user) {
  if (!user?.token) return null;

  const identifier =
    user.id ??
    user.userId ??
    user.email ??
    user.userName ??
    user.name;

  if (identifier === undefined || identifier === null || identifier === "") return null;
  return `${STORAGE_PREFIX}:${String(identifier).trim().toLowerCase()}`;
}

function resolveStorage(user) {
  if (typeof window === "undefined") return { key: null, storage: null };
  if (user?.token) {
    return { key: getAiChatUserKey(user), storage: window.localStorage };
  }
  return { key: GUEST_STORAGE_KEY, storage: window.sessionStorage };
}

export function readAiChats(user) {
  const { key, storage } = resolveStorage(user);
  if (!key || !storage) return [];

  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((chat) => chat?.id && Array.isArray(chat.messages))
      .sort((first, second) => Number(second.updatedAt || 0) - Number(first.updatedAt || 0));
  } catch {
    return [];
  }
}

export function writeAiChats(user, chats) {
  const { key, storage } = resolveStorage(user);
  if (!key || !storage) return;

  try {
    storage.setItem(key, JSON.stringify(Array.isArray(chats) ? chats : []));
    window.dispatchEvent(new CustomEvent(AI_CHATS_UPDATED_EVENT, { detail: { storageKey: key } }));
  } catch {
    // Keep the active conversation usable when browser storage is unavailable.
  }
}

export function getRecentAiChats(user, limit = 2) {
  return readAiChats(user).slice(0, limit);
}
