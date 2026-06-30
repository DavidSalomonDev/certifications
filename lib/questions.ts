// Capa de acceso a datos: preguntas de una certificación.
//
// 👉 Punto único para migrar a una base de datos o agregar filtros (p. ej. por tema):
//    - Para BD: reemplaza el `fetch` por tu API/DB manteniendo el tipo Question.
//    - Para clasificar por tema: filtra por `topic` dentro de getPool().

import type { Certification, Question } from "./types";
import type { Lang } from "./language";
import { getCertification } from "./certifications";

/** Carga el array completo de preguntas (incluye las "complex"). */
export async function loadQuestions(cert: Certification): Promise<Question[]> {
  const res = await fetch(`/data/${cert.file}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo cargar ${cert.file}`);
  return (await res.json()) as Question[];
}

/** Campos de texto traducibles de una pregunta (ver public/data/<cert>.es.json). */
interface QuestionTranslation {
  question?: string;
  options?: string[];
  explanation?: string;
}
type TranslationMap = Record<string, QuestionTranslation>;

/**
 * Carga el mapa de traducciones `public/data/<cert>.es.json` (id → textos).
 * Si no existe (cert aún sin traducir), devuelve un mapa vacío: la app cae a inglés.
 */
async function loadTranslations(certId: string): Promise<TranslationMap> {
  try {
    const res = await fetch(`/data/${certId}.es.json`, { cache: "no-store" });
    if (!res.ok) return {};
    return (await res.json()) as TranslationMap;
  } catch {
    return {};
  }
}

/**
 * Aplica las traducciones al texto de cada pregunta. El fallback es por campo:
 * lo que no esté traducido queda en inglés. `answer`, `images`, `type` y
 * `references` no se traducen (vienen del JSON base). Las `options` traducidas
 * deben respetar el mismo orden y cantidad (los índices de `answer` apuntan ahí).
 */
function applyTranslations(
  questions: Question[],
  translations: TranslationMap,
): Question[] {
  return questions.map((q) => {
    const t = translations[q.id];
    if (!t) return q;
    const options =
      t.options && t.options.length === q.options.length ? t.options : q.options;
    return {
      ...q,
      question: t.question ?? q.question,
      options,
      explanation: t.explanation ?? q.explanation,
    };
  });
}

/**
 * Carga las preguntas de un cert por id, en el idioma indicado (default inglés).
 * Lanza error si el cert no existe.
 */
export async function loadQuestionsById(
  certId: string,
  lang: Lang = "en",
): Promise<Question[]> {
  const cert = await getCertification(certId);
  if (!cert) throw new Error(`Certificación no encontrada: ${certId}`);
  const base = await loadQuestions(cert);
  if (lang === "en") return base;
  const translations = await loadTranslations(certId);
  return applyTranslations(base, translations);
}

/**
 * Pool jugable: solo preguntas respondibles como texto (single | multiple).
 * Las "complex" (HOTSPOT/DRAG-DROP que dependen de imágenes) quedan fuera hasta
 * que se agreguen sus imágenes.
 *
 * Para filtrar por tema en el futuro: añade aquí `&& (topic == null || q.topic === topic)`.
 */
export function getPool(questions: Question[]): Question[] {
  return questions.filter((q) => q.type === "single" || q.type === "multiple");
}
