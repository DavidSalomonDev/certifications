// Utilidades de aleatoriedad.

/** Devuelve una copia barajada del array (Fisher-Yates). No muta el original. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Toma `n` elementos al azar sin repetición.
 * Si n >= arr.length, devuelve todos (barajados).
 */
export function sampleWithoutReplacement<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.max(0, n));
}

/** Elige un elemento al azar (o undefined si está vacío). */
export function pickOne<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}
