// Lógica de puntuación del quiz.

import type { Question, QuizResults } from "./types";

/**
 * Una respuesta es correcta si el conjunto de índices seleccionados es
 * exactamente igual al conjunto de índices correctos.
 * (single = igualdad simple; multiple = igualdad de conjuntos; parcial = incorrecto)
 */
export function isCorrect(
  answer: number[],
  selected: number[] | undefined,
): boolean {
  if (!selected) return false;
  if (answer.length !== selected.length) return false;
  const a = [...answer].sort((x, y) => x - y);
  const b = [...selected].sort((x, y) => x - y);
  return a.every((v, i) => v === b[i]);
}

/** Calcula totales de un conjunto de preguntas dadas las respuestas del usuario. */
export function computeResults(
  questions: Question[],
  answers: Record<string, number[]>,
): QuizResults {
  const total = questions.length;
  let correct = 0;
  for (const q of questions) {
    if (isCorrect(q.answer, answers[q.id])) correct++;
  }
  const incorrect = total - correct;
  const percentage = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, incorrect, percentage };
}
