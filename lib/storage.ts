// Persistencia local (sin login). Todo vive en localStorage del navegador.
// Las claves se prefijan con el certId para que cada certificación sea independiente.

import type { QuizSession } from "./types";

const sessionKey = (certId: string) => `${certId}:practice-session:v1`;
const randomKey = (certId: string) => `${certId}:random-history:v1`;

const hasWindow = () => typeof window !== "undefined";

function readJSON<T>(key: string): T | null {
  if (!hasWindow()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento lleno o no disponible: ignoramos silenciosamente */
  }
}

function remove(key: string): void {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

// ---- Sesión de práctica (modo quiz) ----

export function loadSession(certId: string): QuizSession | null {
  return readJSON<QuizSession>(sessionKey(certId));
}

export function saveSession(session: QuizSession): void {
  writeJSON(sessionKey(session.certId), session);
}

export function clearSession(certId: string): void {
  remove(sessionKey(certId));
}

/** ¿Hay una sesión sin terminar que se pueda retomar? */
export function hasInProgressSession(certId: string): boolean {
  const s = loadSession(certId);
  return !!s && s.status === "in-progress";
}

// ---- Historial del modo "pregunta random" ----

export function loadRandomHistory(certId: string): string[] {
  return readJSON<string[]>(randomKey(certId)) ?? [];
}

export function saveRandomHistory(certId: string, ids: string[]): void {
  writeJSON(randomKey(certId), ids);
}

export function clearRandomHistory(certId: string): void {
  remove(randomKey(certId));
}
