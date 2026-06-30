import Image from "next/image";
import type { Question } from "@/lib/types";

interface Props {
  question: Question;
  /** Encabezado opcional, p. ej. "Pregunta 3 de 10". */
  heading?: string;
}

/** Muestra el enunciado de una pregunta y su imagen (si existe). */
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
      {question.image && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          {/* unoptimized: imágenes locales estáticas, sin pipeline de optimización */}
          <Image
            src={question.image}
            alt="Imagen de la pregunta"
            width={800}
            height={500}
            unoptimized
            className="h-auto w-full"
          />
        </div>
      )}
    </div>
  );
}
