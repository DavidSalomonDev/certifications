"use client";

import { useEffect, useState } from "react";
import { useHighlighter, type HighlightTool } from "@/lib/highlighter";
import { loadStudyNotes, saveStudyNotes } from "@/lib/storage";

const TOOLS: { id: HighlightTool; label: string; swatch: string }[] = [
  { id: "blue", label: "Resaltar en azul", swatch: "bg-sky-300 dark:bg-sky-400/70" },
  { id: "green", label: "Resaltar en verde", swatch: "bg-emerald-300 dark:bg-emerald-400/70" },
  { id: "red", label: "Resaltar en rojo", swatch: "bg-rose-300 dark:bg-rose-400/70" },
];

const HINTS: Record<HighlightTool, string> = {
  blue: "Selecciona texto para resaltarlo en azul.",
  green: "Selecciona texto para resaltarlo en verde.",
  red: "Selecciona texto para resaltarlo en rojo.",
  erase: "Selecciona texto o toca un resaltado para borrarlo.",
};

/** Botones de herramienta (3 colores + goma), en fila o en columna. */
function ToolButtons({ vertical = false }: { vertical?: boolean }) {
  const { tool, setTool, applySelection } = useHighlighter();

  // Si ya hay texto seleccionado, se aplica directamente; si no, se activa la
  // herramienta (o se desactiva si ya estaba activa).
  const pick = (t: HighlightTool) => {
    if (applySelection(t)) setTool(t);
    else setTool(tool === t ? null : t);
  };

  const base =
    "flex h-8 w-8 items-center justify-center rounded-full border-2 transition";
  const ring = (active: boolean) =>
    active
      ? " border-slate-700 ring-2 ring-slate-400/50 dark:border-slate-100"
      : " border-transparent hover:border-slate-300 dark:hover:border-slate-500";

  return (
    <div className={vertical ? "flex flex-col items-center gap-2" : "flex items-center gap-2"}>
      {TOOLS.map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.label}
          aria-label={t.label}
          aria-pressed={tool === t.id}
          // Evita que el clic borre la selección de texto antes de aplicarla.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => pick(t.id)}
          className={base + ring(tool === t.id)}
        >
          <span className={`h-5 w-5 rounded-full ${t.swatch}`} />
        </button>
      ))}
      <button
        type="button"
        title="Goma: borrar resaltados"
        aria-label="Goma: borrar resaltados"
        aria-pressed={tool === "erase"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => pick("erase")}
        className={
          base +
          ring(tool === "erase") +
          " bg-slate-100 text-sm dark:bg-slate-700"
        }
      >
        🧽
      </button>
    </div>
  );
}

const OPEN_KEY = "study-sidebar-open";

/**
 * Barra lateral derecha del modo estudio: una tira fina a toda la altura, pegada
 * al borde, con los colores y la goma. Se puede extender hacia la izquierda para
 * ver los apuntes; ese estado se recuerda en el navegador.
 */
export default function StudySidebar({ certId }: { certId: string }) {
  const { tool, highlights, clearAll } = useHighlighter();
  const hasHighlights = Object.keys(highlights).length > 0;
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  // La cabecera es sticky y su alto cambia si se parte en dos líneas.
  const [top, setTop] = useState(0);

  useEffect(() => {
    setNotes(loadStudyNotes(certId));
  }, [certId]);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const measure = () => setTop(header.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, next ? "1" : "0");
    } catch {
      /* noop */
    }
  };

  const onNotes = (text: string) => {
    setNotes(text);
    saveStudyNotes(certId, text);
  };

  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-full border-2 border-transparent text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200";

  return (
    <aside
      data-hl-ignore
      style={{ top }}
      className={
        "fixed bottom-0 right-0 z-10 flex border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800" +
        (open ? " shadow-xl" : "")
      }
    >
      {open && (
        <div className="flex w-52 flex-col gap-3 border-r border-slate-200 p-3 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Resaltador
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {tool ? HINTS[tool] : "Elige un color y selecciona texto."}
            </p>
          </div>
          <label
            htmlFor="study-notes"
            className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
          >
            Apuntes
          </label>
          <textarea
            id="study-notes"
            value={notes}
            onChange={(e) => onNotes(e.target.value)}
            placeholder="Escribe aquí tus notas…"
            className="-mt-1 min-h-40 flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          />
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Se guardan solos en este navegador.
          </p>
        </div>
      )}

      <div className="flex w-12 flex-col items-center gap-2 py-3">
        <button
          type="button"
          title={open ? "Contraer barra" : "Extender barra (apuntes)"}
          aria-label={open ? "Contraer barra" : "Extender barra (apuntes)"}
          aria-expanded={open}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleOpen}
          className={iconBtn + " text-base font-bold"}
        >
          {open ? "»" : "«"}
        </button>
        <div className="my-1 h-px w-6 bg-slate-200 dark:bg-slate-700" />
        <ToolButtons vertical />
        {hasHighlights && (
          <>
            <div className="my-1 h-px w-6 bg-slate-200 dark:bg-slate-700" />
            <button
              type="button"
              title="Borrar todos los resaltados"
              aria-label="Borrar todos los resaltados"
              onClick={() => {
                if (confirm("¿Borrar todos los resaltados de esta certificación?")) clearAll();
              }}
              className={iconBtn}
            >
              🗑️
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
