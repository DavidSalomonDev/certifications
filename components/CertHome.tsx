"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Certification, Question, QuizSession } from "@/lib/types";
import { getCertification } from "@/lib/certifications";
import { loadQuestions, getPool } from "@/lib/questions";
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
  const [count, setCount] = useState(10);
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
      setCanResume(hasInProgressSession(certId));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [certId]);

  const startQuiz = () => {
    const ids = sampleWithoutReplacement(
      pool.map((q) => q.id),
      count,
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
  const maxN = pool.length;

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
          {maxN} preguntas disponibles para practicar.
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
        <p className="mt-5 mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">
          ¿Cuántas preguntas quieres practicar?
        </p>
        <NumberSelector value={count} onChange={setCount} max={maxN} />
        <button
          type="button"
          onClick={startQuiz}
          className="mt-6 w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 sm:w-auto"
        >
          {canResume ? "Empezar un quiz nuevo" : "Iniciar quiz"} ({count}{" "}
          preguntas)
        </button>
        {canResume && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            Empezar uno nuevo reemplazará el quiz en curso.
          </p>
        )}
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
