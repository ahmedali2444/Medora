import { useMemo } from "react";
import { useLang } from "../context/LanguageContext";
import {
  getLocalizedList,
  getLocalizedText,
  localizeEntityFields,
} from "../utils/localization";

export function useLocalizedContent() {
  const { lang, t } = useLang();

  return useMemo(
    () => ({
      lang,
      isRtl: t.dir === "rtl",
      text: (value, fallback = "") => getLocalizedText(value, lang, fallback),
      list: (values) => getLocalizedList(values, lang),
      entity: (record, fields) => localizeEntityFields(record, fields, lang),
    }),
    [lang, t.dir],
  );
}
