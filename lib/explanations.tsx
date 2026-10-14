"use client";

// Explicaciones largas completas o resumidas, en TODAS las preguntas (toggle
// global de la cabecera). Se persiste en localStorage. Por defecto: resumidas.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "explanations-expanded";

interface ExplanationsContextValue {
  /** true = explicaciones completas; false = resumidas a unas líneas. */
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  /** true una vez leída la preferencia de localStorage (evita parpadeos). */
  mounted: boolean;
}

const ExplanationsContext = createContext<ExplanationsContextValue>({
  expanded: false,
  setExpanded: () => {},
  mounted: false,
});

export function ExplanationsProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpandedState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "1" || saved === "0") setExpandedState(saved === "1");
    } catch {
      /* noop */
    }
    setMounted(true);
  }, []);

  const setExpanded = (v: boolean) => {
    setExpandedState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* noop */
    }
  };

  return (
    <ExplanationsContext.Provider value={{ expanded, setExpanded, mounted }}>
      {children}
    </ExplanationsContext.Provider>
  );
}

export const useExplanations = () => useContext(ExplanationsContext);
