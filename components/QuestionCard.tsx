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
