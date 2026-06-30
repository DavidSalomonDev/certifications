import type { Question } from "@/lib/types";

/** Bloque de explicación + referencias de una pregunta. */
export default function ExplanationBox({ question }: { question: Question }) {
  if (!question.explanation && question.references.length === 0) return null;
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
      <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
        Explicación
      </p>
      {question.explanation && (
        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {question.explanation}
        </p>
      )}
      {question.references.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Referencias
          </p>
          <ul className="mt-1 space-y-1">
            {question.references.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
