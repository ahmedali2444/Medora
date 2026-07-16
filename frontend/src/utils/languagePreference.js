import i18n from "../i18n";
import { getToken } from "../api/client";
import { medoraApi } from "../api/medoraApi";

export function normalizeLanguage(language) {
  return language === "en" ? "en" : "ar";
}

export function applyLanguage(language) {
  const normalized = normalizeLanguage(language);
  if (normalizeLanguage(i18n.resolvedLanguage) !== normalized) {
    void i18n.changeLanguage(normalized);
  }
}

export async function syncLanguageToServer(language) {
  if (!getToken()) return;
  try {
    await medoraApi.updateLanguage({ language: normalizeLanguage(language) });
  } catch (error) {
    console.warn("Failed to sync language preference", error);
  }
}

export async function applyServerLanguagePreference(preferredLanguage) {
  if (preferredLanguage) {
    applyLanguage(preferredLanguage);
    return;
  }

  await syncLanguageToServer(i18n.resolvedLanguage || "ar");
}
