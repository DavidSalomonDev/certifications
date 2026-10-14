"use client";

import { usePathname } from "next/navigation";
import { useExplanations } from "@/lib/explanations";

/** Vistas de una certificación que muestran explicaciones. */
const VIEWS = new Set(["study", "random", "quiz"]);

/** Botón de la cabecera para ver todas las explicaciones completas o resumidas. */
export default function ExplanationsToggle() {
  const { expanded, setExpanded, mounted } = useExplanations();
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || !VIEWS.has(parts[1])) return null;

  const label = expanded ? "Resumir explicaciones" : "Explicaciones completas";

  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      aria-pressed={expanded}
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
            {/* Flechas hacia fuera = expandir; hacia dentro = contraer */}
            {expanded ? (
              <path d="M8 4l4 4 4-4M8 20l4-4 4 4M4 12h16" />
            ) : (
              <path d="M8 8l4-4 4 4M8 16l4 4 4-4M4 12h16" />
            )}
          </svg>
          <span className="hidden sm:inline">{label}</span>
        </>
      )}
    </button>
  );
}
