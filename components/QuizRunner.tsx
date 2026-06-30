"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Question, QuizSession } from "@/lib/types";
import { loadQuestionsById } from "@/lib/questions";
import { useLanguage } from "@/lib/language";
import { loadSession, saveSession, clearSession } from "@/lib/storage";
import { computeResults } from "@/lib/quiz";
import { formatDuration } from "@/lib/time";
import QuestionCard from "./QuestionCard";
import AnswersList from "./AnswersList";
import ResultsSummary from "./ResultsSummary";
import QuestionReviewList from "./QuestionReviewList";

/** Orquesta la sesión de práctica: navegación, cronómetro, guardado y resultados. */
export default function QuizRunner({ certId }: { certId: string }) {
  const router = useRouter();
  const { lang, mounted } = useLanguage();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cronómetro: acumulado + inicio del segmento activo + tiempo a mostrar.
  const accumulatedRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const [displayMs, setDisplayMs] = useState(0);

  /** Avanza el acumulado con el segmento activo y devuelve el total actual. */
  const checkpoint = () => {
    if (segmentStartRef.current != null) {
      const now = Date.now();
      accumulatedRef.current += now - segmentStartRef.current;
      segmentStartRef.current = now;
    }
    return accumulatedRef.current;
  };

  useEffect(() => {
    if (!mounted) return; // espera a conocer el idioma para no recargar dos veces
    let active = true;
    (async () => {
      const s = loadSession(certId);
      if (!s) {
        router.replace(`/${certId}`); // sin sesión: volver a la home del cert
        return;
      }
      try {
        // Recarga al cambiar de idioma: ids/respuestas/orden no cambian, solo el texto.
        const all = await loadQuestionsById(certId, lang);
        if (!active) return;
        setSession(s);
        setQuestions(all);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [certId, router, lang, mounted]);

  // Cronómetro activo solo mientras el quiz está en progreso.
  const status = session?.status;
  useEffect(() => {
    if (status !== "in-progress") return;
    accumulatedRef.current = loadSession(certId)?.elapsedMs ?? 0;
    segmentStartRef.current = Date.now();
    setDisplayMs(accumulatedRef.current);

    const id = setInterval(() => {
      if (segmentStartRef.current != null) {
        setDisplayMs(
          accumulatedRef.current + (Date.now() - segmentStartRef.current),
        );
      }
    }, 1000);

    const persist = () => {
      const s = loadSession(certId);
      if (s && s.status === "in-progress") {
        saveSession({ ...s, elapsedMs: checkpoint() });
      }
    };
    window.addEventListener("beforeunload", persist);

    return () => {
      clearInterval(id);
      window.removeEventListener("beforeunload", persist);
      persist(); // guardar el tiempo al desmontar / cambiar de estado
    };
  }, [status, certId]);

  // Preguntas de la sesión, en el orden fijado al iniciar.
  const sessionQuestions = useMemo(() => {
    if (!questions || !session) return [] as Question[];
    const byId = new Map(questions.map((q) => [q.id, q]));
    return session.questionIds
      .map((id) => byId.get(id))
      .filter((q): q is Question => Boolean(q));
  }, [questions, session]);

  /** Aplica una mutación a la sesión y la persiste (con el tiempo al día). */
  const update = (mut: (s: QuizSession) => QuizSession) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = mut(prev);
      const elapsedMs =
        prev.status === "in-progress" ? checkpoint() : next.elapsedMs;
      const withTime = { ...next, elapsedMs };
      saveSession(withTime);
      return withTime;
    });
  };

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
  if (!session) return null; // redirigiendo a la home

  const answeredCount = sessionQuestions.filter(
    (q) => (session.answers[q.id]?.length ?? 0) > 0,
  ).length;

  // ---- Vista de resultados ----
  if (session.status === "finished") {
    const results = computeResults(sessionQuestions, session.answers);
    return (
      <div className="space-y-6">
        <ResultsSummary results={results} timeMs={session.elapsedMs} />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              clearSession(certId);
              router.push(`/${certId}`);
            }}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700"
          >
            Nuevo quiz
          </button>
          <Link
            href={`/${certId}`}
            onClick={() => clearSession(certId)}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Volver al inicio
          </Link>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold text-slate-800 dark:text-slate-100">
            Repaso de respuestas
          </h2>
          <QuestionReviewList
            questions={sessionQuestions}
            answers={session.answers}
          />
        </div>
      </div>
    );
  }

  // ---- Vista en progreso ----
  const idx = session.currentIndex;
  const current = sessionQuestions[idx];
  if (!current) {
    return (
      <p className="text-center text-slate-500 dark:text-slate-400">
        No se encontró la pregunta actual.
      </p>
    );
  }
  const selected = session.answers[current.id] ?? [];
  const isLast = idx === sessionQuestions.length - 1;
  const unanswered = sessionQuestions.length - answeredCount;

  const setSelected = (next: number[]) =>
    update((s) => ({
      ...s,
      answers: { ...s.answers, [current.id]: next },
    }));

  const goTo = (i: number) => update((s) => ({ ...s, currentIndex: i }));

  const finish = () => {
    if (
      unanswered > 0 &&
      !window.confirm(
        `Tienes ${unanswered} pregunta(s) sin responder. Contarán como incorrectas. ¿Finalizar de todos modos?`,
      )
    ) {
      return;
    }
    update((s) => ({ ...s, status: "finished" }));
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  return (
    <div className="space-y-6">
      {/* Progreso + cronómetro */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            Pregunta {idx + 1} de {sessionQuestions.length}
          </span>
          <span className="flex items-center gap-3">
            <span>{answeredCount} respondidas</span>
            <span
              className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              aria-label="Tiempo transcurrido"
            >
              ⏱ {formatDuration(displayMs)}
            </span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-blue-600 transition-all"
            style={{
              width: `${((idx + 1) / sessionQuestions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Navegador de preguntas */}
      <div className="flex flex-wrap gap-1.5">
        {sessionQuestions.map((q, i) => {
          const ans = (session.answers[q.id]?.length ?? 0) > 0;
          const here = i === idx;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ir a la pregunta ${i + 1}`}
              className={
                "h-8 w-8 rounded-md border text-xs font-semibold transition " +
                (here
                  ? "border-blue-600 ring-2 ring-blue-300 dark:ring-blue-700 "
                  : "border-slate-300 dark:border-slate-600 ") +
                (ans
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700")
              }
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Pregunta */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <QuestionCard question={current} />
        {current.type === "multiple" && (
          <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-400">
            Selecciona todas las que correspondan.
          </p>
        )}
        <div className="mt-5">
          <AnswersList
            options={current.options}
            multiple={current.type === "multiple"}
            selected={selected}
            onSelect={setSelected}
          />
        </div>
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(idx - 1)}
          disabled={idx === 0}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:enabled:hover:bg-slate-700"
        >
          ← Anterior
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={finish}
            className="rounded-lg bg-green-600 px-6 py-2.5 font-semibold text-white hover:bg-green-700"
          >
            Finalizar quiz
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goTo(idx + 1)}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700"
          >
            Siguiente →
          </button>
        )}
      </div>
    </div>
  );
}
