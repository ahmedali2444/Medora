import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { translations } from "./context/LanguageContext";

const STORAGE_KEY = "medora_lang";
const DEFAULT_LANGUAGE = "ar";

const isBrowser = typeof window !== "undefined";

const normalizeLanguage = (language) => (language === "en" ? "en" : "ar");

const getInitialLanguage = () => {
  if (!isBrowser) {
    return DEFAULT_LANGUAGE;
  }

  return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
};

const applyDocumentLanguage = (language) => {
  if (!isBrowser) {
    return;
  }

  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
};

const initialLanguage = getInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: translations.ar },
      en: { translation: translations.en },
    },
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ["ar", "en"],
    interpolation: {
      escapeValue: false,
    },
    returnObjects: true,
    initImmediate: false,
  });

applyDocumentLanguage(initialLanguage);

i18n.on("languageChanged", (language) => {
  const normalizedLanguage = normalizeLanguage(language);

  if (isBrowser) {
    window.localStorage.setItem(STORAGE_KEY, normalizedLanguage);
  }

  applyDocumentLanguage(normalizedLanguage);
});

export default i18n;
