"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Question } from "@/lib/types";
import {
  loadQuestionsById,
  getStudyPool,
  splitComplexImages,
  questionNumber,
} from "@/lib/questions";
import { useLanguage } from "@/lib/language";
import { loadPrefs, savePrefs } from "@/lib/storage";
import { HighlighterProvider, useHighlighter } from "@/lib/highlighter";
import QuestionCard from "./QuestionCard";
import AnswersList from "./AnswersList";
import ExplanationBox from "./ExplanationBox";
import ComplexAnswer from "./ComplexAnswer";
import StudySidebar from "./StudySidebar";

/** Opciones de "preguntas por página". */
const PAGE_SIZES = [5, 10, 20] as const;
const DEFAULT_PAGE_SIZE = 20;

type Order = "desc" | "asc";
type Kind = "all" | "choice" | "complex";
type StudyPrefs = {
  topic: string | null;
  order: Order;
  kind: Kind;
  page: number;
  pageSize: number;
};

/**
 * Modo estudio: solo lectura. Muestra cada pregunta con su(s) respuesta(s)
 * correcta(s) reveladas y la explicación, filtrable por categoría. No se
 * responde nada; es para leer y repasar. Incluye un resaltador y un bloc de
 * apuntes (barra lateral derecha) que se guardan en el navegador.
 */
export default function StudyMode({ certId }: { certId: string }) {
  return (
    <HighlighterProvider certId={certId}>
      <StudyModeContent certId={certId} />
    </HighlighterProvider>
  );
}

function StudyModeContent({ certId }: { certId: string }) {
  const { lang, mounted } = useLanguage();
  const { tool, highlights, clearQuestion } = useHighlighter();
  const [pool, setPool] = useState<Question[]>([]);
  const [topic, setTopic] = useState<string | null>(null); // null = todas
  // Orden de lectura. Por defecto, las más recientes primero (las últimas del
  // banco son las más actualizadas).
  const [order, setOrder] = useState<Order>("desc");
  // Tipo: todas, solo opción múltiple (single/multiple) o solo "complex".
  const [kind, setKind] = useState<Kind>("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // true una vez restauradas las preferencias guardadas (antes no guardamos
  // para no pisarlas con los valores por defecto).
  const [prefsReady, setPrefsReady] = useState(false);

  useEffect(() => {
    const p = loadPrefs<StudyPrefs>(certId, "study");
    if (p.topic !== undefined) setTopic(p.topic);
    if (p.order === "asc" || p.order === "desc") setOrder(p.order);
    if (p.kind === "all" || p.kind === "choice" || p.kind === "complex") setKind(p.kind);
    if (typeof p.page === "number") setPage(p.page);
    if (PAGE_SIZES.some((n) => n === p.pageSize)) setPageSize(p.pageSize!);
    setPrefsReady(true);
  }, [certId]);

  useEffect(() => {
    if (prefsReady)
      savePrefs(certId, "study", { topic, order, kind, page, pageSize });
  }, [certId, prefsReady, topic, order, kind, page, pageSize]);

  useEffect(() => {
    if (!mounted) return; // espera a conocer el idioma para no recargar dos veces
    let active = true;
    (async () => {
      try {
        const all = await loadQuestionsById(certId, lang);
        if (!active) return;
        setPool(getStudyPool(all));
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

  // Conteos por tipo (para el selector) y pool según el tipo elegido.
  const complexCount = useMemo(
    () => pool.filter((q) => q.type === "complex").length,
    [pool],
  );
  const typedPool = useMemo(
    () =>
      kind === "all"
        ? pool
        : pool.filter((q) => (q.type === "complex") === (kind === "complex")),
    [pool, kind],
  );

  // Categorías disponibles (topic + topicSecondary) con su nº de preguntas.
  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of typedPool) {
      const set = new Set<string>();
      if (q.topic) set.add(q.topic);
      if (q.topicSecondary) set.add(q.topicSecondary);
      for (const t of set) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [typedPool]);

  // La categoría guardada puede no existir ya (otro tipo, banco actualizado…).
  const activeTopic =
    topic && topics.some(([t]) => t === topic) ? topic : null;

  const filtered = useMemo(() => {
    const list = activeTopic
      ? typedPool.filter(
          (q) => q.topic === activeTopic || q.topicSecondary === activeTopic,
        )
      : [...typedPool];
    const dir = order === "desc" ? -1 : 1;
    return list.sort((a, b) => dir * (questionNumber(a) - questionNumber(b)));
  }, [typedPool, activeTopic, order]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

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
    // pr-10: deja sitio a la tira del resaltador en pantallas pequeñas.
    <div className="space-y-6 pr-10 lg:pr-0">
      <StudySidebar certId={certId} />
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <Link
          href={`/${certId}`}
          className="hover:text-slate-700 dark:hover:text-slate-200"
        >
          ← Volver
        </Link>
        <span>{filtered.length} preguntas</span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
      {/* Orden */}
      <div>
        <label
          htmlFor="study-order"
          className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          Orden
        </label>
        <select
          id="study-order"
          value={order}
          onChange={(e) => {
            setOrder(e.target.value as Order);
            setPage(0);
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
        >
          <option value="desc">Más recientes primero (de la última a la primera)</option>
          <option value="asc">Desde la primera</option>
        </select>
      </div>

      {/* Preguntas por página */}
      <div>
        <label
          htmlFor="study-page-size"
          className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          Por página
        </label>
        <select
          id="study-page-size"
          value={pageSize}
          onChange={(e) => {
            const size = Number(e.target.value);
            setPageSize(size);
            // Mantiene a la vista la primera pregunta de la página actual.
            setPage(Math.floor(start / size));
          }}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n} preguntas
            </option>
          ))}
        </select>
      </div>

      {/* Filtro por tipo (solo si hay preguntas "complex") */}
      {complexCount > 0 && (
        <div>
          <label
            htmlFor="study-kind"
            className="mb-2 block text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            Tipo
          </label>
          <select
            id="study-kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as Kind);
              setTopic(null); // la categoría elegida puede no existir con este tipo
              setPage(0);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
          >
            <option value="all">Todas ({pool.length})</option>
            <option value="choice">
              Solo opción múltiple ({pool.length - complexCount})
            </option>
            <option value="complex">
              Solo HOTSPOT / DRAG-DROP / simulación ({complexCount})
            </option>
          </select>
        </div>
      )}

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
            value={activeTopic ?? ""}
            onChange={(e) => {
              setTopic(e.target.value || null);
              setPage(0);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
          >
            <option value="">Todas las categorías ({typedPool.length})</option>
            {topics.map(([t, n]) => (
              <option key={t} value={t}>
                {t} ({n})
              </option>
            ))}
          </select>
        </div>
      )}
      </div>

      <Pagination />

      {/* Lista de preguntas (solo lectura) */}
      <div
        data-hl-tool={tool ?? undefined}
        className={"space-y-4" + (tool ? " cursor-text" : "")}
      >
        {pageItems.map((q, i) => (
          <div
            key={q.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <QuestionCard
              question={q}
              heading={`Pregunta #${questionNumber(q)} · ${start + i + 1} de ${filtered.length}`}
              images={splitComplexImages(q).prompt}
            />
            {q.type === "complex" ? (
              <ComplexAnswer question={q} />
            ) : (
              <div className="mt-4">
                <AnswersList
                  options={q.options}
                  multiple={q.type === "multiple"}
                  selected={[]}
                  reveal
                  correct={q.answer}
                  questionId={q.id}
                />
              </div>
            )}
            <ExplanationBox question={q} />
            {highlights[q.id] && (
              <button
                type="button"
                onClick={() => clearQuestion(q.id)}
                className="mt-3 text-xs font-semibold text-slate-400 hover:text-rose-600 hover:underline dark:text-slate-500 dark:hover:text-rose-400"
              >
                Quitar resaltados de esta pregunta
              </button>
            )}
          </div>
        ))}
      </div>

      <Pagination />
    </div>
  );
}
