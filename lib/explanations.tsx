"use client";

// Explicaciones largas completas o resumidas (toggle global de la cabecera).
// El estado por defecto se persiste en localStorage (por defecto: resumidas);
// cada pregunta puede abrirse o cerrarse a mano, y el toggle refleja lo que
// hay en pantalla: si alguna explicación larga está completa, ofrece resumir.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "explanations-expanded";

interface ExplanationsContextValue {
  /** ¿Está completa la explicación de esta pregunta? */
  isExpanded: (id: string) => boolean;
  /** Abre o cierra la explicación de una sola pregunta. */
  setExpandedOne: (id: string, v: boolean) => void;
  /** true si alguna explicación larga en pantalla está completa. */
  anyExpanded: boolean;
  /** Abre o cierra todas (y lo recuerda como estado por defecto). */
  setExpandedAll: (v: boolean) => void;
  /** Las cajas con explicación larga se registran mientras están montadas. */
  register: (id: string) => () => void;
  /** true una vez leída la preferencia de localStorage (evita parpadeos). */
  mounted: boolean;
}

const ExplanationsContext = createContext<ExplanationsContextValue>({
  isExpanded: () => false,
  setExpandedOne: () => {},
  anyExpanded: false,
  setExpandedAll: () => {},
  register: () => () => {},
  mounted: false,
});

export function ExplanationsProvider({ children }: { children: ReactNode }) {
  const [byDefault, setByDefault] = useState(false);
  // Cambios manuales por pregunta; se borran al pulsar el toggle global.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  // Nº de cajas largas montadas por id (una pregunta puede salir dos veces).
  const [visible, setVisible] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "1" || saved === "0") setByDefault(saved === "1");
    } catch {
      /* noop */
    }
    setMounted(true);
  }, []);

  const isExpanded = (id: string) => overrides[id] ?? byDefault;

  const setExpandedOne = (id: string, v: boolean) =>
    setOverrides((o) => ({ ...o, [id]: v }));

  const setExpandedAll = (v: boolean) => {
    setByDefault(v);
    setOverrides({});
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* noop */
    }
  };

  const register = useCallback((id: string) => {
    setVisible((m) => ({ ...m, [id]: (m[id] ?? 0) + 1 }));
    return () =>
      setVisible((m) => {
        const { [id]: n = 0, ...rest } = m;
        return n > 1 ? { ...rest, [id]: n - 1 } : rest;
      });
  }, []);

  const ids = Object.keys(visible);
  // Sin explicaciones largas en pantalla, el toggle muestra el estado por defecto.
  const anyExpanded = ids.length ? ids.some(isExpanded) : byDefault;

  return (
    <ExplanationsContext.Provider
      value={{
        isExpanded,
        setExpandedOne,
        anyExpanded,
        setExpandedAll,
        register,
        mounted,
      }}
    >
      {children}
    </ExplanationsContext.Provider>
  );
}

export const useExplanations = () => useContext(ExplanationsContext);
