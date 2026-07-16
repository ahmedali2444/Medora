export const DEFAULT_LOCALE = "ar";
export const SUPPORTED_LOCALES = ["ar", "en"];
export const LOCALE_TAGS = {
  ar: "ar-EG",
  en: "en-US",
};

export function isSupportedLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

export function normalizeLocale(locale) {
  return isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function getLocaleTag(locale = DEFAULT_LOCALE) {
  return LOCALE_TAGS[normalizeLocale(locale)] || LOCALE_TAGS[DEFAULT_LOCALE];
}

export function isLocalizedValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return SUPPORTED_LOCALES.some((locale) => typeof value[locale] === "string");
}

export function localizedText(ar, en = "") {
  return { ar, en };
}

export function getLocalizedText(value, locale = DEFAULT_LOCALE, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (!isLocalizedValue(value)) {
    return fallback;
  }

  const normalizedLocale = normalizeLocale(locale);

  return (
    value[normalizedLocale] ||
    value[DEFAULT_LOCALE] ||
    value.en ||
    Object.values(value).find((entry) => typeof entry === "string" && entry.trim()) ||
    fallback
  );
}

export function getUserDisplayName(user, locale = DEFAULT_LOCALE) {
  if (!user) return "";

  const normalizedLocale = normalizeLocale(locale);
  const arabicName = user.fullName || user.name || "";
  const englishName = user.fullNameEn || "";

  if (normalizedLocale === "en") {
    return englishName || arabicName || user.userName || user.email || "";
  }

  return arabicName || englishName || user.userName || user.email || "";
}

export function getLocalizedList(values, locale = DEFAULT_LOCALE) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => getLocalizedText(value, locale)).filter(Boolean);
}

export function getLocalizedSearchText(value) {
  if (typeof value === "string") {
    return value.toLowerCase();
  }

  if (!isLocalizedValue(value)) {
    return "";
  }

  return SUPPORTED_LOCALES.map((locale) => value[locale] || "")
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function formatLocalizedNumber(
  value,
  locale = DEFAULT_LOCALE,
  options = {},
) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return new Intl.NumberFormat(getLocaleTag(locale), {
    numberingSystem: "latn",
    ...options,
  }).format(value);
}

export function formatLocalizedCurrency(
  value,
  locale = DEFAULT_LOCALE,
  currency = "EGP",
  options = {},
) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return new Intl.NumberFormat(getLocaleTag(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    numberingSystem: "latn",
    ...options,
  }).format(value);
}

export function formatLocalizedDate(
  value,
  locale = DEFAULT_LOCALE,
  options = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  },
) {
  if (!value) {
    return "";
  }

  let date = value;

  if (typeof value === "string") {
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      date = parsedDate;
    } else {
      const parts = value.split("-");
      if (parts.length === 3) {
        const [year, month, day] = parts.map(Number);
        date = new Date(year, month - 1, day);
      }
    }
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(getLocaleTag(locale), options).format(date);
}

export function localizeEntityFields(entity, fields, locale = DEFAULT_LOCALE) {
  if (!entity || typeof entity !== "object") {
    return entity;
  }

  return fields.reduce(
    (result, field) => ({
      ...result,
      [field]: getLocalizedText(entity[field], locale, entity[field]),
    }),
    { ...entity },
  );
}

export function buildLocalizedRecord(record = {}) {
  return SUPPORTED_LOCALES.reduce((result, locale) => {
    result[locale] = typeof record[locale] === "string" ? record[locale] : "";
    return result;
  }, {});
}
