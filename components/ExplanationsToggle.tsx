"use client";

import { usePathname } from "next/navigation";
import { useExplanations } from "@/lib/explanations";

/** Vistas de una certificación que muestran explicaciones. */
const VIEWS = new Set(["study", "random", "quiz"]);

/** Botón de la cabecera para mostrar u ocultar todas las explicaciones. */
export default function ExplanationsToggle() {
  const { show, setShow, mounted } = useExplanations();
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || !VIEWS.has(parts[1])) return null;

  const label = show ? "Ocultar explicaciones" : "Mostrar explicaciones";

  return (
    <button
      type="button"
      onClick={() => setShow(!show)}
      aria-pressed={show}
      aria-label={label}
      title={label}
      className="flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {/* Evita parpadeo hasta conocer la preferencia real */}
      {mounted && (
        <>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {!show && <path d="M3 3l18 18" />}
          </svg>
          <span className="hidden sm:inline">{label}</span>
        </>
      )}
    </button>
  );
}
