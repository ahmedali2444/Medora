import { useState, useEffect, useCallback } from "react";


const SENSITIVE_FIELDS = ["password", "confirmPassword", "currentPassword"];


export function usePersistedForm(key, initialState) {
  const storageKey = `medora_form_${key}`;

  const [form, setFormState] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...initialState, ...parsed };
        // Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„Ø­Ø³Ø§Ø³Ø© Ø¨ØªØ¨Ø¯Ø£ Ø¯Ø§ÙŠÙ…Ø§Ù‹ ÙØ§Ø¶ÙŠØ©
        SENSITIVE_FIELDS.forEach((field) => {
          merged[field] = initialState[field] ?? "";
        });
        return merged;
      }
    } catch {
      // Ignore storage read failures and fall back to the initial state.
    }

    return initialState;
  });

  // Ø§Ø­ÙØ¸ ÙÙŠ localStorage ÙƒÙ„ Ù…Ø§ ØªØºÙŠÙ‘Ø± Ø§Ù„Ù€ form
  useEffect(() => {
    try {
      const toSave = { ...form };
      SENSITIVE_FIELDS.forEach((field) => {
        delete toSave[field];
      });
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch {
      // Ignore storage write failures so the form keeps working normally.
    }
  }, [form, storageKey]);

  // Ù…Ø³Ø­ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª (ÙŠÙØ³ØªØ¯Ø¹Ù‰ Ø¨Ø¹Ø¯ submit Ù†Ø§Ø¬Ø­)
  const clearPersisted = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage delete failures; they should not block the submit flow.
    }
  }, [storageKey]);

  return [form, setFormState, clearPersisted];
}
