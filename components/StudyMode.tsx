"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Question } from "@/lib/types";
import { loadQuestionsById, getPool } from "@/lib/questions";
import { useLanguage } from "@/lib/language";
import QuestionCard from "./QuestionCard";
import AnswersList from "./AnswersList";
import ExplanationBox from "./ExplanationBox";

const PAGE_SIZE = 20;

/**
 * Modo estudio: solo lectura. Muestra cada pregunta con su(s) respuesta(s)
 * correcta(s) reveladas y la explicación, filtrable por categoría. No se
 * responde nada; es para leer y repasar.
 */
export default function StudyMode({ certId }: { certId: string }) {
  const { lang, mounted } = useLanguage();
  const [pool, setPool] = useState<Question[]>([]);
  const [topic, setTopic] = useState<string | null>(null); // null = todas
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return; // espera a conocer el idioma para no recargar dos veces
    let active = true;
    (async () => {
      try {
        const all = await loadQuestionsById(certId, lang);
        if (!active) return;
        setPool(getPool(all));
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [certId, lang, mounted]);

  // Categorías disponibles (topic + topicSecondary) con su nº de preguntas.
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of pool) {
      const set = new Set<string>();
      if (q.topic) set.add(q.topic);
      if (q.topicSecondary) set.add(q.topicSecondary);
      for (const t of set) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [pool]);

  const filtered = useMemo(
    () =>
      topic
        ? pool.filter((q) => q.topic === topic || q.topicSecondary === topic)
        : pool,
    [pool, topic],
  );

  // Al cambiar de categoría volvemos a la primera página.
  useEffect(() => {
    setPage(0);
  }, [topic]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  const goToPage = (p: number) => {
    setPage(p);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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

  const Pagination = () =>
    totalPages > 1 ? (
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goToPage(safePage - 1)}
          disabled={safePage === 0}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:enabled:hover:bg-slate-700"
        >
          ← Anterior
        </button>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Página {safePage + 1} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => goToPage(safePage + 1)}
          disabled={safePage >= totalPages - 1}
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:enabled:hover:bg-slate-700"
        >
          Siguiente →
        </button>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <Link
          href={`/${certId}`}
          className="hover:text-slate-700 dark:hover:text-slate-200"
        >
          ← Volver
        </Link>
        <span>{filtered.length} preguntas</span>
      </div>

      {/* Filtro por categoría */}
      {topics.length > 0 && (
        <div>
          <label
            htmlFor="study-topic-filter"
            className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            Categoría
          </label>
          <select
            id="study-topic-filter"
            value={topic ?? ""}
            onChange={(e) => setTopic(e.target.value || null)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
          >
            <option value="">Todas las categorías ({pool.length})</option>
            {topics.map(([t, n]) => (
              <option key={t} value={t}>
                {t} ({n})
              </option>
            ))}
          </select>
        </div>
      )}

      <Pagination />

      {/* Lista de preguntas (solo lectura) */}
      <div className="space-y-4">
        {pageItems.map((q, i) => (
          <div
            key={q.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <QuestionCard
              question={q}
              heading={`Pregunta ${start + i + 1} de ${filtered.length}`}
            />
            <div className="mt-4">
              <AnswersList
                options={q.options}
                multiple={q.type === "multiple"}
                selected={[]}
                reveal
                correct={q.answer}
              />
            </div>
            <ExplanationBox question={q} />
          </div>
        ))}
      </div>

      <Pagination />
    </div>
  );
}
