"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Certification, Question, QuizSession } from "@/lib/types";
import { getCertification } from "@/lib/certifications";
import {
  loadQuestions,
  getPool,
  getRecentIds,
  questionNumber,
  RECENT_COUNT,
} from "@/lib/questions";
import {
  hasInProgressSession,
  loadSession,
  saveSession,
} from "@/lib/storage";
import { sampleWithoutReplacement } from "@/lib/random";
import NumberSelector from "./NumberSelector";

/** Home de una certificación: elegir N e iniciar quiz, retomar, o modo random. */
export default function CertHome({ certId }: { certId: string }) {
  const router = useRouter();
  const [cert, setCert] = useState<Certification | null>(null);
  const [pool, setPool] = useState<Question[]>([]);
  const [totalCount, setTotalCount] = useState(0); // incluye las "complex"
  // Ids de las últimas RECENT_COUNT preguntas del banco (las más actualizadas).
  const [recentIds, setRecentIds] = useState<Set<string>>(new Set());
  const [recentOnly, setRecentOnly] = useState(false);
  const [count, setCount] = useState(10);
  const [topic, setTopic] = useState<string | null>(null); // null = todas las categorías
  const [canResume, setCanResume] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const c = await getCertification(certId);
      if (!active) return;
      if (!c || !c.enabled) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const all = await loadQuestions(c);
      if (!active) return;
      setCert(c);
      setPool(getPool(all));
      setTotalCount(all.length);
      setRecentIds(getRecentIds(all));
      setCanResume(hasInProgressSession(certId));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [certId]);

  // Pool base según el rango elegido: todo el banco o solo las más recientes.
  const recentPool = useMemo(
    () => pool.filter((q) => recentIds.has(q.id)),
    [pool, recentIds],
  );
  const basePool = recentOnly ? recentPool : pool;

  // Rango de números de las recientes (p. ej. #239–#388) para el selector.
  const recentNums = [...recentIds].map((id) => questionNumber({ id }));
  const recentFrom = recentNums.length ? Math.min(...recentNums) : 0;
  const recentTo = recentNums.length ? Math.max(...recentNums) : 0;

  // Categorías disponibles (topic + topicSecondary) con su nº de preguntas.
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of basePool) {
      const set = new Set<string>();
      if (q.topic) set.add(q.topic);
      if (q.topicSecondary) set.add(q.topicSecondary);
      for (const t of set) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [basePool]);

  // Pool efectivo según la categoría elegida (una pregunta cuenta si su topic
  // principal O secundario coincide). null = todas.
  const filteredPool = useMemo(
    () =>
      topic
        ? basePool.filter((q) => q.topic === topic || q.topicSecondary === topic)
        : basePool,
    [basePool, topic],
  );

  const startQuiz = () => {
    const ids = sampleWithoutReplacement(
      filteredPool.map((q) => q.id),
      Math.min(count, filteredPool.length),
    );
    const session: QuizSession = {
      certId,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      createdAt: Date.now(),
      count: ids.length,
      questionIds: ids,
      currentIndex: 0,
      answers: {},
      elapsedMs: 0,
      status: "in-progress",
    };
    saveSession(session);
    router.push(`/${certId}/quiz`);
  };

  if (loading) {
    return <p className="text-center text-slate-500">Cargando…</p>;
  }
  if (notFound) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-slate-600 dark:text-slate-300">
          Esta certificación no está disponible.
        </p>
        <Link href="/" className="text-blue-600 hover:underline dark:text-blue-400">
          ← Ver certificaciones
        </Link>
      </div>
    );
  }

  const resumeSession = canResume ? loadSession(certId) : null;
  const maxN = filteredPool.length;
  // Si la categoría reduce el pool por debajo del nº elegido, ajustamos el efectivo.
  const effectiveCount = Math.min(count, maxN);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ← Certificaciones
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100">
          {cert?.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {pool.length} preguntas de opción múltiple para el quiz
          {totalCount > pool.length &&
            ` · ${totalCount} en total en modo estudio y random (incluye HOTSPOT / DRAG-DROP)`}
          .
        </p>
      </div>

      {resumeSession && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950">
          <p className="font-semibold text-blue-900 dark:text-blue-100">
            Tienes un quiz en curso
          </p>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
            {resumeSession.count} preguntas · vas en la{" "}
            {resumeSession.currentIndex + 1}.
          </p>
          <Link
            href={`/${certId}/quiz`}
            className="mt-3 inline-block rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Continuar quiz
          </Link>
        </div>
      )}

      {/* Modo práctica */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Modo práctica
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Responde todas las preguntas y revisa tus resultados al final.
        </p>

        {totalCount > RECENT_COUNT && (
          <>
            <label
              htmlFor="range-filter"
              className="mt-5 mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              Preguntas
            </label>
            <select
              id="range-filter"
              value={recentOnly ? "recent" : "all"}
              onChange={(e) => {
                setRecentOnly(e.target.value === "recent");
                setTopic(null); // la categoría elegida puede no existir en el nuevo rango
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
            >
              <option value="all">Todo el banco ({pool.length})</option>
              <option value="recent">
                {`Solo las últimas ${RECENT_COUNT}: #${recentFrom}–#${recentTo} (${recentPool.length} de opción múltiple)`}
              </option>
            </select>
          </>
        )}

        {topics.length > 0 && (
          <>
            <label
              htmlFor="topic-filter"
              className="mt-5 mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300"
            >
              Categoría
            </label>
            <select
              id="topic-filter"
              value={topic ?? ""}
              onChange={(e) => setTopic(e.target.value || null)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
            >
              <option value="">Todas las categorías ({basePool.length})</option>
              {topics.map(([t, n]) => (
                <option key={t} value={t}>
                  {t} ({n})
                </option>
              ))}
            </select>
          </>
        )}

        <p className="mt-5 mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          ¿Cuántas preguntas quieres practicar?
        </p>
        <NumberSelector value={effectiveCount} onChange={setCount} max={maxN} />
        <button
          type="button"
          onClick={startQuiz}
          disabled={maxN === 0}
          className="mt-6 w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {canResume ? "Empezar un quiz nuevo" : "Iniciar quiz"} ({effectiveCount}{" "}
          preguntas)
        </button>
        {canResume && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Empezar uno nuevo reemplazará el quiz en curso.
          </p>
        )}
      </div>

      {/* Modo estudio */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Modo estudio
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Lee las preguntas con su respuesta correcta y explicación. Sin
          responder, filtrable por categoría.
        </p>
        <Link
          href={`/${certId}/study`}
          className="mt-5 inline-block rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Entrar al modo estudio →
        </Link>
      </div>

      {/* Modo random */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Pregunta random
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Una pregunta a la vez con respuesta y explicación inmediata.
        </p>
        <Link
          href={`/${certId}/random`}
          className="mt-5 inline-block rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        >
          Practicar una pregunta random →
        </Link>
      </div>
    </div>
  );
}
