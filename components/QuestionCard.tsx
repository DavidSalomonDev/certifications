import type { Question } from "@/lib/types";

interface Props {
  question: Question;
  /** Encabezado opcional, p. ej. "Pregunta 3 de 10". */
  heading?: string;
}

/** Muestra el enunciado de una pregunta y sus imágenes (si existen). */
export default function QuestionCard({ question, heading }: Props) {
  // Cada línea es una oración (ver reflow en scripts/convert.mjs): la mostramos
  // como párrafo independiente para un espaciado cómodo.
  const lines = question.question.split("\n").filter((l) => l.trim());

  return (
    <div>
      {heading && (
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {heading}
        </p>
      )}
      {(question.topic || question.topicSecondary) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {question.topic && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
              {question.topic}
            </span>
          )}
          {question.topicSecondary && (
            <span className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-600 dark:text-slate-400">
              {question.topicSecondary}
            </span>
          )}
        </div>
      )}
      <div className="space-y-2.5">
        {lines.map((line, i) => (
          <p
            key={i}
            className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-100"
          >
            {line}
          </p>
        ))}
      </div>
      {question.images.length > 0 && (
        <div className="mt-4 space-y-3">
          {question.images.map((src, i) => (
            // Imágenes locales estáticas de aspecto variado: <img> simple con
            // altura automática para no deformarlas. (no next/image: sin dims).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={`Imagen ${i + 1} de la pregunta`}
              loading="lazy"
              className="h-auto w-full rounded-lg border border-slate-200 dark:border-slate-700"
            />
          ))}
        </div>
      )}
    </div>
  );
}
