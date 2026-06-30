"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Question } from "@/lib/types";
import { loadQuestionsById, getPool } from "@/lib/questions";
import { loadRandomHistory, saveRandomHistory } from "@/lib/storage";
import { isCorrect } from "@/lib/quiz";
import { pickOne } from "@/lib/random";
import QuestionCard from "./QuestionCard";
import AnswersList from "./AnswersList";
import ExplanationBox from "./ExplanationBox";

/** Modo "pregunta random": una pregunta a la vez con feedback inmediato. */
export default function RandomQuestion({ certId }: { certId: string }) {
  const [pool, setPool] = useState<Question[]>([]);
  const [current, setCurrent] = useState<Question | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [wasReset, setWasReset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Sirve una pregunta nueva que no esté en el historial (reinicia si se agotaron). */
  const serveFrom = (p: Question[], hist: string[]) => {
    let remaining = p.filter((q) => !hist.includes(q.id));
    let base = hist;
    let reset = false;
    if (remaining.length === 0) {
      remaining = p;
      base = [];
      reset = true;
    }
    const next = pickOne(remaining);
    if (!next) return;
    const newHistory = [...base, next.id];
    saveRandomHistory(certId, newHistory);
    setHistory(newHistory);
    setCurrent(next);
    setSelected([]);
    setRevealed(false);
    setWasReset(reset);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const all = await loadQuestionsById(certId);
        const p = getPool(all);
        if (!active) return;
        setPool(p);
        serveFrom(p, loadRandomHistory(certId));
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certId]);

  if (loading) {
    return (
      <p className="text-center text-slate-500 dark:text-slate-400">Cargando…</p>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Error: {error}
      </div>
    );
  }
  if (!current) {
    return (
      <p className="text-center text-slate-500 dark:text-slate-400">
        No hay preguntas disponibles.
      </p>
    );
  }

  const correct = revealed && isCorrect(current.answer, selected);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <Link
          href={`/${certId}`}
          className="hover:text-slate-700 dark:hover:text-slate-200"
        >
          ← Volver
        </Link>
        <span>
          Vistas {history.length} de {pool.length}
        </span>
      </div>

      {wasReset && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          ¡Completaste todas las preguntas! Empezamos de nuevo desde cero.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <QuestionCard question={current} />
        {current.type === "multiple" && !revealed && (
          <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-400">
            Selecciona todas las que correspondan.
          </p>
        )}

        <div className="mt-5">
          <AnswersList
            options={current.options}
            multiple={current.type === "multiple"}
            selected={selected}
            onSelect={revealed ? undefined : setSelected}
            reveal={revealed}
            correct={current.answer}
          />
        </div>

        {revealed && (
          <>
            <div
              className={
                "mt-4 rounded-lg px-4 py-3 text-sm font-semibold " +
                (correct
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200")
              }
            >
              {correct ? "✓ ¡Correcto!" : "✗ Incorrecto"}
            </div>
            <ExplanationBox question={current} />
          </>
        )}
      </div>

      <div className="flex justify-between gap-3">
        {!revealed ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            disabled={selected.length === 0}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Responder
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => serveFrom(pool, history)}
          className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Otra pregunta →
        </button>
      </div>
    </div>
  );
}
