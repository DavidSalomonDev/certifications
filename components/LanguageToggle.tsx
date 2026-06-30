"use client";

import { useLanguage } from "@/lib/language";

/** Botón para alternar el idioma del contenido de las preguntas (EN/ES). */
export default function LanguageToggle() {
  const { lang, setLang, mounted } = useLanguage();
  const next = lang === "es" ? "en" : "es";

  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      aria-label={
        lang === "es" ? "Switch questions to English" : "Cambiar preguntas a español"
      }
      title={
        lang === "es" ? "Questions in English" : "Preguntas en español"
      }
      className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {/* Evita parpadeo hasta conocer la preferencia real */}
      {mounted ? (lang === "es" ? "ES" : "EN") : ""}
    </button>
  );
}
