// Tipos compartidos por toda la app.

/** Tipo de pregunta según cómo se responde. */
export type QuestionType = "single" | "multiple" | "complex";

/** Una pregunta tal como vive en public/data/<cert>.json */
export interface Question {
  id: string;
  question: string;
  options: string[];
  /** Índices (0-based) de las opciones correctas. */
  answer: number[];
  explanation: string;
  references: string[];
  /**
   * Rutas a imágenes estáticas de la pregunta (exhibits/diagramas), p. ej.
   * ["/images/az-700/q10-1.jpeg", ...]. Vacío si la pregunta no tiene imagen.
   * Se muestran al final del enunciado.
   */
  images: string[];
  type: QuestionType;
  /** Tema/categoría. Reservado para clasificación futura. */
  topic: string | null;
}

/** Una certificación registrada en public/data/certifications.json */
export interface Certification {
  id: string;
  name: string;
  /** Nombre del archivo JSON dentro de public/data/ */
  file: string;
  /** Cantidad de preguntas jugables (single + multiple). */
  questionCount: number;
  enabled: boolean;
}

/** Estado persistido de una sesión de práctica (modo quiz). */
export interface QuizSession {
  certId: string;
  id: string;
  createdAt: number;
  count: number;
  /** Los N ids elegidos, en orden fijo. */
  questionIds: string[];
  currentIndex: number;
  /** questionId -> índices seleccionados por el usuario. */
  answers: Record<string, number[]>;
  /** Tiempo acumulado del test en milisegundos (cronómetro). */
  elapsedMs: number;
  status: "in-progress" | "finished";
}

/** Resultado calculado al finalizar un quiz. */
export interface QuizResults {
  total: number;
  correct: number;
  incorrect: number;
  percentage: number;
}
