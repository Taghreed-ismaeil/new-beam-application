import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { STRINGS, type StringKey } from "@/lib/app-strings";

/**
 * Customer-app language (English / Arabic), switched from the Profile page.
 *
 * Kept separate from lib/i18n.ts (the admin panel's language) so a customer
 * switching to Arabic doesn't flip the staff panel and vice versa.
 *
 * Arabic changes text only (see makeDir) — no I18nManager.forceRTL either:
 * it needs an app reload and is reset by Expo Go
 * every time a project opens, so it would never show up while testing there.
 */

export type AppLang = "en" | "ar";

const STORAGE_KEY = "beem_app_lang";

type Params = Record<string, string | number | null | undefined>;

type Localized = {
  name?: string | null;
  nameEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
} | null | undefined;

function interpolate(str: string, params?: Params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, key) => {
    const v = params[key];
    return v === undefined || v === null ? m : String(v);
  });
}

/**
 * Layout is NOT mirrored in Arabic — the owner wants every button, tab, icon
 * and arrow to stay exactly where it is in English, with only the text
 * changing. So the layout helpers below are fixed LTR values; only `text`
 * (alignment + writing direction) and `noSpacing` react to the language.
 * The helpers are kept so screens don't need touching if that ever changes.
 */
function makeDir(isRTL: boolean) {
  return {
    isRTL,
    row: { flexDirection: "row" as const },
    rowReverse: { flexDirection: "row-reverse" as const },
    /** Start-aligned text (left in English, right in Arabic). */
    text: {
      textAlign: isRTL ? ("right" as const) : ("left" as const),
      writingDirection: isRTL ? ("rtl" as const) : ("ltr" as const),
    },
    itemsStart: { alignItems: "flex-start" as const },
    itemsEnd: { alignItems: "flex-end" as const },
    selfStart: { alignSelf: "flex-start" as const },
    selfEnd: { alignSelf: "flex-end" as const },
    flip: null,
    /** Letter spacing breaks Arabic letter joining — drop it in Arabic. */
    noSpacing: isRTL ? { letterSpacing: 0 } : null,
    chevron: "chevron-forward" as const,
    arrow: "arrow-forward" as const,
  };
}

export type Dir = ReturnType<typeof makeDir>;

type AppLangValue = {
  lang: AppLang;
  isRTL: boolean;
  setLang: (lang: AppLang) => void;
  t: (key: StringKey, params?: Params) => string;
  /** Name from an API object (Arabic `name` / English `nameEn`). */
  pick: (obj: Localized) => string;
  /** Description from an API object (`description` / `descriptionEn`). */
  pickDesc: (obj: Localized) => string;
  dir: Dir;
};

const AppLangContext = createContext<AppLangValue | null>(null);

export function AppLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLang>("en");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw === "ar" || raw === "en") setLangState(raw);
      })
      .catch(() => {});
  }, []);

  const setLang = useCallback((next: AppLang) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key: StringKey, params?: Params) => {
      const entry = STRINGS[key];
      if (!entry) return key;
      return interpolate(lang === "ar" ? entry[1] : entry[0], params);
    },
    [lang],
  );

  const pick = useCallback(
    (obj: Localized) => {
      if (!obj) return "";
      return lang === "ar" ? obj.name || obj.nameEn || "" : obj.nameEn || obj.name || "";
    },
    [lang],
  );

  const pickDesc = useCallback(
    (obj: Localized) => {
      if (!obj) return "";
      return lang === "ar"
        ? obj.description || obj.descriptionEn || ""
        : obj.descriptionEn || obj.description || "";
    },
    [lang],
  );

  const value = useMemo(() => {
    const isRTL = lang === "ar";
    return { lang, isRTL, setLang, t, pick, pickDesc, dir: makeDir(isRTL) };
  }, [lang, setLang, t, pick, pickDesc]);

  return React.createElement(AppLangContext.Provider, { value }, children);
}

export function useAppLang() {
  const ctx = useContext(AppLangContext);
  if (!ctx) throw new Error("useAppLang must be used within AppLangProvider");
  return ctx;
}
