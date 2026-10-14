"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";

/** Líneas de la explicación que siempre se muestran; el resto se colapsa. */
const PREVIEW_LINES = 5;

/** Bloque de explicación + referencias de una pregunta. */
export default function ExplanationBox({ question }: { question: Question }) {
  // Guardamos el id expandido (no un booleano) para que, al pasar a otra
  // pregunta con el mismo componente (modo random), vuelva a colapsarse.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!question.explanation && question.references.length === 0) return null;

  const lines = question.explanation
    ? question.explanation.split("\n").filter((l) => l.trim())
    : [];
  const hidden = Math.max(0, lines.length - PREVIEW_LINES);
  const expanded = expandedId === question.id;
  const shown = expanded || hidden === 0 ? lines : lines.slice(0, PREVIEW_LINES);

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
      <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Explicación
      </p>
      {shown.length > 0 && (
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {shown.join("\n")}
          {!expanded && hidden > 0 && "…"}
        </p>
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpandedId(expanded ? null : question.id)}
          className="mt-2 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          {expanded
            ? "Ver menos ▲"
            : `Ver explicación completa (${hidden} ${hidden === 1 ? "línea" : "líneas"} más) ▼`}
        </button>
      )}
      {question.references.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Referencias
          </p>
          <ul className="mt-1 space-y-1">
            {question.references.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
