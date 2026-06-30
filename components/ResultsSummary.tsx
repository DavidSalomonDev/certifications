import type { QuizResults } from "@/lib/types";
import { formatDuration } from "@/lib/time";

/** Resumen de resultados: correctas, incorrectas, porcentaje y tiempo total. */
export default function ResultsSummary({
  results,
  timeMs,
}: {
  results: QuizResults;
  timeMs?: number;
}) {
  const { total, correct, incorrect, percentage } = results;
  const approved = percentage >= 70; // umbral orientativo (AZ-104 ≈ 700/1000)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Resultado
      </p>
      <p
        className={
          "mt-1 text-5xl font-extrabold " +
          (approved
            ? "text-green-600 dark:text-green-400"
            : "text-amber-600 dark:text-amber-400")
        }
      >
        {percentage}%
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm">
        <div>
          <span className="block text-2xl font-bold text-green-600 dark:text-green-400">
            {correct}
          </span>
          <span className="text-slate-500 dark:text-slate-400">Correctas</span>
        </div>
        <div>
          <span className="block text-2xl font-bold text-red-600 dark:text-red-400">
            {incorrect}
          </span>
          <span className="text-slate-500 dark:text-slate-400">Incorrectas</span>
        </div>
        <div>
          <span className="block text-2xl font-bold text-slate-700 dark:text-slate-200">
            {total}
          </span>
          <span className="text-slate-500 dark:text-slate-400">Total</span>
        </div>
        {typeof timeMs === "number" && (
          <div>
            <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatDuration(timeMs)}
            </span>
            <span className="text-slate-500 dark:text-slate-400">Tiempo</span>
          </div>
        )}
      </div>
    </div>
  );
}
