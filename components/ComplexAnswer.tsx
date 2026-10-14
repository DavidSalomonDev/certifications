import type { Question } from "@/lib/types";
import { splitComplexImages } from "@/lib/questions";

/**
 * Respuesta de una pregunta "complex" (HOTSPOT/DRAG-DROP/simulación/case study):
 * no tiene opciones A–D, así que mostramos la imagen del "Answer Area" resuelto
 * (si existe). La explicación va aparte (ExplanationBox).
 */
export default function ComplexAnswer({ question }: { question: Question }) {
  const { answer } = splitComplexImages(question);
  return (
    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40">
      <p className="mb-2 text-sm font-semibold text-green-800 dark:text-green-200">
        Respuesta
      </p>
      {answer.length > 0 ? (
        <div className="space-y-3">
          {answer.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt="Respuesta correcta"
              loading="lazy"
              className="h-auto w-full rounded-lg border border-slate-200 dark:border-slate-700"
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-green-800 dark:text-green-200">
          Revisa la explicación (y las imágenes de la pregunta) para ver la respuesta.
        </p>
      )}
    </div>
  );
}

/** Aviso de tipo para preguntas "complex" (no se responden con A–D). */
export function ComplexBadge() {
  return (
    <p className="mt-3 text-xs font-medium text-amber-600 dark:text-amber-400">
      Pregunta tipo HOTSPOT / DRAG-DROP / simulación: piensa tu respuesta y luego revélala.
    </p>
  );
}
