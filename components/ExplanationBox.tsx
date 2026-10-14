"use client";

import { useEffect, useRef, useState } from "react";
import type { Question } from "@/lib/types";
import { useExplanations } from "@/lib/explanations";
import HighlightedText from "./HighlightedText";

/** Altura máxima de la explicación colapsada (~4 líneas de texto). */
const COLLAPSED_REM = 6;

/** Desvanecido al final del texto colapsado (funciona en claro y oscuro). */
const FADE_MASK = "linear-gradient(to bottom, black 55%, transparent)";

/**
 * Bloque de explicación + referencias de una pregunta. El toggle global de la
 * cabecera decide si las explicaciones largas arrancan completas o resumidas;
 * cada pregunta puede cambiarlo localmente hasta que se vuelva a pulsar el
 * toggle global.
 */
export default function ExplanationBox({ question }: { question: Question }) {
  const { expanded: expandedAll } = useExplanations();
  // El cambio local solo vale para esta pregunta y este estado del toggle
  // global: al pasar a otra pregunta (modo random) o pulsar el toggle, se
  // vuelve al estado por defecto.
  const [local, setLocal] = useState<
    { id: string; all: boolean; expanded: boolean } | null
  >(null);
  const [overflows, setOverflows] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const expanded =
    local && local.id === question.id && local.all === expandedAll
      ? local.expanded
      : expandedAll;

  // El corte es por altura en pantalla, no por nº de líneas: medimos si el
  // texto completo supera el alto colapsado (y re-medimos al cambiar el ancho).
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const measure = () => {
      const limit = parseFloat(getComputedStyle(document.documentElement).fontSize) * COLLAPSED_REM;
      setOverflows(el.scrollHeight > limit + 4);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [question.id, question.explanation]);

  if (!question.explanation && question.references.length === 0) return null;

  const collapsed = overflows && !expanded;

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/50">
      <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Explicación
      </p>
      {question.explanation && (
        <p
          ref={textRef}
          className="overflow-hidden whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300"
          style={
            collapsed
              ? {
                  maxHeight: `${COLLAPSED_REM}rem`,
                  maskImage: FADE_MASK,
                  WebkitMaskImage: FADE_MASK,
                }
              : undefined
          }
        >
          <HighlightedText
            questionId={question.id}
            field="exp"
            text={question.explanation}
          />
        </p>
      )}
      {overflows && (
        <button
          type="button"
          onClick={() =>
            setLocal({ id: question.id, all: expandedAll, expanded: !expanded })
          }
          aria-expanded={expanded}
          className="mt-1 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          {collapsed ? "Ver explicación completa ▼" : "Ver menos ▲"}
        </button>
      )}
      {question.references.length > 0 && (
        <div className="mt-2">
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
