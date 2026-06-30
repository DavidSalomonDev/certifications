import type { Question } from "@/lib/types";
import { isCorrect } from "@/lib/quiz";
import QuestionCard from "./QuestionCard";
import AnswersList from "./AnswersList";
import ExplanationBox from "./ExplanationBox";

interface Props {
  questions: Question[];
  answers: Record<string, number[]>;
}

/** Listado de repaso: cada pregunta con tu respuesta vs la correcta + explicación. */
export default function QuestionReviewList({ questions, answers }: Props) {
  return (
    <div className="space-y-4">
      {questions.map((q, idx) => {
        const selected = answers[q.id] ?? [];
        const correct = isCorrect(q.answer, selected);
        return (
          <div
            key={q.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
                Pregunta {idx + 1}
              </span>
              <span
                className={
                  "rounded-full px-3 py-1 text-xs font-bold " +
                  (correct
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200")
                }
              >
                {correct ? "✓ Correcta" : "✗ Incorrecta"}
              </span>
            </div>

            <div className="mb-4">
              <QuestionCard question={q} />
            </div>

            <AnswersList
              options={q.options}
              multiple={q.type === "multiple"}
              selected={selected}
              reveal
              correct={q.answer}
            />

            {selected.length === 0 && (
              <p className="mt-2 text-xs italic text-slate-400 dark:text-slate-500">
                No respondiste esta pregunta.
              </p>
            )}

            <ExplanationBox question={q} />
          </div>
        );
      })}
    </div>
  );
}
