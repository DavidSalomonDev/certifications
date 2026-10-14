"use client";

import type { ReactNode } from "react";
import type { HighlightColor } from "@/lib/types";
import { useHighlighter } from "@/lib/highlighter";

export const MARK_CLASSES: Record<HighlightColor, string> = {
  blue: "bg-sky-200/80 dark:bg-sky-400/30",
  green: "bg-emerald-200/80 dark:bg-emerald-400/30",
  red: "bg-rose-200/80 dark:bg-rose-400/30",
};

interface Props {
  /** Sin questionId (o fuera del modo estudio) se pinta el texto tal cual. */
  questionId?: string;
  /** Fragmento de la pregunta: "q:<línea>", "opt:<i>" o "exp:<línea>". */
  field: string;
  text: string;
}

/**
 * Texto con los resaltados del usuario. El textContent del span debe ser
 * exactamente `text`: los offsets guardados se calculan sobre él.
 */
export default function HighlightedText({ questionId, field, text }: Props) {
  const { enabled, highlights } = useHighlighter();
  if (!enabled || !questionId) return <>{text}</>;

  const ranges = highlights[questionId]?.[field] ?? [];
  const parts: ReactNode[] = [];
  let pos = 0;
  for (const r of ranges) {
    const start = Math.max(pos, Math.min(r.start, text.length));
    const end = Math.min(r.end, text.length);
    if (end <= start) continue;
    if (start > pos) parts.push(text.slice(pos, start));
    parts.push(
      <mark
        key={start}
        className={`rounded-sm text-inherit ${MARK_CLASSES[r.color]}`}
      >
        {text.slice(start, end)}
      </mark>,
    );
    pos = end;
  }
  if (pos < text.length) parts.push(text.slice(pos));

  return (
    <span data-hl-q={questionId} data-hl-field={field}>
      {parts}
    </span>
  );
}
