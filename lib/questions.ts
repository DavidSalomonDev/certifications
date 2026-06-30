// Capa de acceso a datos: preguntas de una certificación.
//
// 👉 Punto único para migrar a una base de datos o agregar filtros (p. ej. por tema):
//    - Para BD: reemplaza el `fetch` por tu API/DB manteniendo el tipo Question.
//    - Para clasificar por tema: filtra por `topic` dentro de getPool().

import type { Certification, Question } from "./types";
import { getCertification } from "./certifications";

/** Carga el array completo de preguntas (incluye las "complex"). */
export async function loadQuestions(cert: Certification): Promise<Question[]> {
  const res = await fetch(`/data/${cert.file}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo cargar ${cert.file}`);
  return (await res.json()) as Question[];
}

/** Carga las preguntas de un cert por id. Lanza error si el cert no existe. */
export async function loadQuestionsById(certId: string): Promise<Question[]> {
  const cert = await getCertification(certId);
  if (!cert) throw new Error(`Certificación no encontrada: ${certId}`);
  return loadQuestions(cert);
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
