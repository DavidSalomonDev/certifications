"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Certification } from "@/lib/types";
import { getEnabledCertifications } from "@/lib/certifications";

/** Pantalla raíz: elige certificación. Si solo hay una, redirige directo a ella. */
export default function CertPicker() {
  const router = useRouter();
  const [certs, setCerts] = useState<Certification[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await getEnabledCertifications();
        if (!active) return;
        if (list.length === 1) {
          router.replace(`/${list[0].id}`); // atajo: una sola cert activa
          return;
        }
        setCerts(list);
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Error: {error}
      </div>
    );
  }
  if (!certs) {
    return <p className="text-center text-slate-500">Cargando…</p>;
  }
  if (certs.length === 0) {
    return (
      <p className="text-center text-slate-500">
        No hay certificaciones disponibles. Corre{" "}
        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
          npm run convert -- &lt;cert&gt;
        </code>
        .
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          Elige una certificación
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Practica para tu examen. Tu progreso se guarda en este navegador.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {certs.map((c) => (
          <Link
            key={c.id}
            href={`/${c.id}`}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500"
          >
            <p className="font-bold text-slate-800 dark:text-slate-100">
              {c.name}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {c.questionCount} preguntas
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
