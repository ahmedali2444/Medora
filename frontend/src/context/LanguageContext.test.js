import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { describe, expect, it } from "vitest";
import { translations } from "./LanguageContext.jsx";

const SRC_DIR = join(cwd(), "src");
const IGNORED_T_PROPS = new Set(["Icon", "id", "label", "labelKey"]);

function collectSourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return collectSourceFiles(path);
    if (!/\.(js|jsx)$/.test(entry.name)) return [];
    if (/\.test\.(js|jsx)$/.test(entry.name)) return [];

    return [path];
  });
}

function collectUsedTranslationKeys() {
  const keys = new Set();
  const keyPattern = /\bt\.([A-Za-z_][A-Za-z0-9_]*)/g;

  for (const file of collectSourceFiles(SRC_DIR)) {
    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(keyPattern)) {
      if (!IGNORED_T_PROPS.has(match[1])) keys.add(match[1]);
    }
  }

  return [...keys].sort();
}

describe("LanguageContext translations", () => {
  it("keeps Arabic and English translation keys in sync", () => {
    const arKeys = Object.keys(translations.ar).sort();
    const enKeys = Object.keys(translations.en).sort();

    expect(enKeys).toEqual(arKeys);
  });

  it("defines every translation key used by frontend source files", () => {
    const usedKeys = collectUsedTranslationKeys();

    for (const lang of Object.keys(translations)) {
      const missingKeys = usedKeys.filter((key) => !(key in translations[lang]));

      expect(missingKeys, `${lang} missing translation keys`).toEqual([]);
    }
  });
});
