"use client";

// Mostrar u ocultar TODAS las explicaciones (toggle global de la cabecera).
// Se persiste en localStorage. Por defecto: visibles.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "explanations";

interface ExplanationsContextValue {
  /** true = explicaciones desplegadas; false = ocultas. */
  show: boolean;
  setShow: (v: boolean) => void;
  /** true una vez leída la preferencia de localStorage (evita parpadeos). */
  mounted: boolean;
}

const ExplanationsContext = createContext<ExplanationsContextValue>({
  show: true,
  setShow: () => {},
  mounted: false,
});

export function ExplanationsProvider({ children }: { children: ReactNode }) {
  const [show, setShowState] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "show" || saved === "hide") setShowState(saved === "show");
    } catch {
      /* noop */
    }
    setMounted(true);
  }, []);

  const setShow = (v: boolean) => {
    setShowState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "show" : "hide");
    } catch {
      /* noop */
    }
  };

  return (
    <ExplanationsContext.Provider value={{ show, setShow, mounted }}>
      {children}
    </ExplanationsContext.Provider>
  );
}

export const useExplanations = () => useContext(ExplanationsContext);
