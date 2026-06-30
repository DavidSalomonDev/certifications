// Capa de acceso a datos: registro de certificaciones.
//
// 👉 Punto único para migrar a una base de datos en el futuro:
//    reemplaza el `fetch` por una llamada a tu API/DB manteniendo el tipo Certification.

import type { Certification } from "./types";

/** Carga todas las certificaciones registradas. */
export async function getCertifications(): Promise<Certification[]> {
  const res = await fetch("/data/certifications.json", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar certifications.json");
  return (await res.json()) as Certification[];
}

/** Solo las certificaciones activas (con preguntas disponibles). */
export async function getEnabledCertifications(): Promise<Certification[]> {
  const certs = await getCertifications();
  return certs.filter((c) => c.enabled);
}

/** Busca una certificación por id (o null si no existe / está deshabilitada). */
export async function getCertification(
  id: string,
): Promise<Certification | null> {
  const certs = await getCertifications();
  return certs.find((c) => c.id === id) ?? null;
}
