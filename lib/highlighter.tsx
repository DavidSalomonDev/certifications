"use client";

// Resaltador del modo estudio. El texto resaltable se marca con
// <span data-hl-q data-hl-field> (ver components/HighlightedText.tsx); al soltar
// el ratón con una herramienta activa, la selección se convierte en tramos
// [start, end) dentro de cada field que toca y se guarda en localStorage.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { HighlightColor, HighlightMap, HighlightRange } from "./types";
import { loadHighlights, saveHighlights } from "./storage";
import { useLanguage } from "./language";

export type HighlightTool = HighlightColor | "erase";

interface HighlighterContextValue {
  /** false fuera del modo estudio: el texto se pinta tal cual. */
  enabled: boolean;
  tool: HighlightTool | null;
  setTool: (t: HighlightTool | null) => void;
  highlights: HighlightMap;
  /** Aplica la herramienta indicada a la selección actual (si la hay). */
  applySelection: (t: HighlightTool) => boolean;
  clearQuestion: (questionId: string) => void;
  clearAll: () => void;
}

const HighlighterContext = createContext<HighlighterContextValue>({
  enabled: false,
  tool: null,
  setTool: () => {},
  highlights: {},
  applySelection: () => false,
  clearQuestion: () => {},
  clearAll: () => {},
});

/**
 * Pinta (o borra, con color = null) el tramo [start, end) sobre `ranges`.
 * Devuelve tramos ordenados, sin solaparse y con los vecinos del mismo color unidos.
 */
function paint(
  ranges: HighlightRange[],
  start: number,
  end: number,
  color: HighlightColor | null,
): HighlightRange[] {
  const out: HighlightRange[] = [];
  for (const r of ranges) {
    if (r.end <= start || r.start >= end) {
      out.push(r);
      continue;
    }
    if (r.start < start) out.push({ ...r, end: start });
    if (r.end > end) out.push({ ...r, start: end });
  }
  if (color) out.push({ start, end, color });
  out.sort((a, b) => a.start - b.start);

  const merged: HighlightRange[] = [];
  for (const r of out) {
    const last = merged[merged.length - 1];
    if (last && last.color === r.color && last.end >= r.start) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

/** Offset (en caracteres de texto) de un punto del DOM dentro de `el`, acotado. */
function offsetIn(el: HTMLElement, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(el);
  const cmp = r.comparePoint(node, offset);
  if (cmp < 0) return 0;
  if (cmp > 0) return el.textContent?.length ?? 0;
  r.setEnd(node, offset);
  return r.toString().length;
}

/** Aplica `color` (null = borrar) a un tramo de un field dentro del mapa. */
function withRange(
  map: HighlightMap,
  questionId: string,
  field: string,
  start: number,
  end: number,
  color: HighlightColor | null,
): HighlightMap {
  const fields = { ...(map[questionId] ?? {}) };
  const ranges = paint(fields[field] ?? [], start, end, color);
  if (ranges.length > 0) fields[field] = ranges;
  else delete fields[field];

  const next = { ...map };
  if (Object.keys(fields).length > 0) next[questionId] = fields;
  else delete next[questionId];
  return next;
}

export function HighlighterProvider({
  certId,
  children,
}: {
  certId: string;
  children: ReactNode;
}) {
  const { lang, mounted } = useLanguage();
  const [tool, setTool] = useState<HighlightTool | null>(null);
  const [highlights, setHighlights] = useState<HighlightMap>({});
  // Refs para que los listeners del documento vean siempre el valor actual.
  const mapRef = useRef<HighlightMap>({});
  const toolRef = useRef<HighlightTool | null>(null);
  toolRef.current = tool;

  useEffect(() => {
    if (!mounted) return;
    const map = loadHighlights(certId, lang);
    mapRef.current = map;
    setHighlights(map);
  }, [certId, lang, mounted]);

  const commit = useCallback(
    (next: HighlightMap) => {
      mapRef.current = next;
      setHighlights(next);
      saveHighlights(certId, lang, next);
    },
    [certId, lang],
  );

  const applySelection = useCallback(
    (t: HighlightTool) => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
      const range = sel.getRangeAt(0);
      const color = t === "erase" ? null : t;

      let next = mapRef.current;
      const els = document.querySelectorAll<HTMLElement>("[data-hl-field]");
      for (const el of els) {
        if (!range.intersectsNode(el)) continue;
        const start = offsetIn(el, range.startContainer, range.startOffset);
        const end = offsetIn(el, range.endContainer, range.endOffset);
        if (end <= start) continue;
        next = withRange(next, el.dataset.hlQ!, el.dataset.hlField!, start, end, color);
      }
      if (next === mapRef.current) return false;
      commit(next);
      sel.removeAllRanges();
      return true;
    },
    [commit],
  );

  useEffect(() => {
    const onUp = (e: Event) => {
      const t = toolRef.current;
      if (!t) return;
      const target = e.target as Element | null;
      // La barra lateral gestiona sus propios clics.
      if (target?.closest?.("[data-hl-ignore]")) return;
      // Esperamos un tick a que el navegador termine de ajustar la selección.
      setTimeout(() => {
        if (applySelection(t)) return;
        // Goma sin selección: un clic sobre un resaltado lo borra entero.
        if (t !== "erase") return;
        const mark = target?.closest?.("mark");
        const el = mark?.closest<HTMLElement>("[data-hl-field]");
        if (!mark || !el) return;
        const start = offsetIn(el, mark, 0);
        const end = offsetIn(el, mark, mark.childNodes.length);
        commit(withRange(mapRef.current, el.dataset.hlQ!, el.dataset.hlField!, start, end, null));
      }, 0);
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
    };
  }, [applySelection, commit]);

  const clearQuestion = useCallback(
    (questionId: string) => {
      if (!mapRef.current[questionId]) return;
      const next = { ...mapRef.current };
      delete next[questionId];
      commit(next);
    },
    [commit],
  );

  const clearAll = useCallback(() => commit({}), [commit]);

  return (
    <HighlighterContext.Provider
      value={{
        enabled: true,
        tool,
        setTool,
        highlights,
        applySelection,
        clearQuestion,
        clearAll,
      }}
    >
      {children}
    </HighlighterContext.Provider>
  );
}

export const useHighlighter = () => useContext(HighlighterContext);
