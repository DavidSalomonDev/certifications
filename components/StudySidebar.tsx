"use client";

import { useEffect, useId, useState } from "react";
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

/** Contenido completo: herramientas, "Borrar todo" y apuntes. */
function PanelBody({
  notes,
  onNotes,
}: {
  notes: string;
  onNotes: (text: string) => void;
}) {
  const { tool, highlights, clearAll } = useHighlighter();
  const hasHighlights = Object.keys(highlights).length > 0;
  const notesId = useId();

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Resaltador
        </p>
        <ToolButtons />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {tool ? HINTS[tool] : "Elige un color y selecciona texto."}
        </p>
        {hasHighlights && (
          <button
            type="button"
            onClick={() => {
              if (confirm("¿Borrar todos los resaltados de esta certificación?")) clearAll();
            }}
            className="mt-2 text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
          >
            Borrar todos los resaltados
          </button>
        )}
      </div>
      <div>
        <label
          htmlFor={notesId}
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
        >
          Apuntes
        </label>
        <textarea
          id={notesId}
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Escribe aquí tus notas…"
          rows={10}
          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        />
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
          Se guardan solos en este navegador.
        </p>
      </div>
    </div>
  );
}

/**
 * Barra lateral derecha del modo estudio. En pantallas anchas es un panel fijo
 * junto al contenido; en pantallas pequeñas, una tira vertical pegada al borde
 * derecho que abre el panel como cajón.
 */
export default function StudySidebar({ certId }: { certId: string }) {
  const [notes, setNotes] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setNotes(loadStudyNotes(certId));
  }, [certId]);

  const onNotes = (text: string) => {
    setNotes(text);
    saveStudyNotes(certId, text);
  };

  const card =
    "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800";

  return (
    <div data-hl-ignore>
      {/* Pantallas anchas: panel fijo a la derecha */}
      <aside
        className={`fixed right-3 top-24 z-20 hidden max-h-[calc(100vh-7rem)] w-56 overflow-y-auto p-4 xl:block ${card}`}
      >
        <PanelBody notes={notes} onNotes={onNotes} />
      </aside>

      {/* Pantallas pequeñas: tira vertical en el borde derecho */}
      <div
        className={`fixed right-0 top-1/3 z-20 rounded-l-xl rounded-r-none border-r-0 p-1.5 xl:hidden ${card}`}
      >
        <ToolButtons vertical />
        <button
          type="button"
          title="Abrir apuntes"
          aria-label="Abrir apuntes"
          onClick={() => setDrawerOpen(true)}
          className="mt-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-transparent text-sm hover:border-slate-300 dark:hover:border-slate-500"
        >
          📝
        </button>
      </div>

      {/* Cajón desde la derecha */}
      {drawerOpen && (
        <div className="fixed inset-0 z-30 xl:hidden">
          <button
            type="button"
            aria-label="Cerrar apuntes"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-slate-900/30"
          />
          <aside className="absolute inset-y-0 right-0 w-72 max-w-[85vw] overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Resaltador y apuntes
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Cerrar ✕
              </button>
            </div>
            <PanelBody notes={notes} onNotes={onNotes} />
          </aside>
        </div>
      )}
    </div>
  );
}
