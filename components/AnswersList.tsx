"use client";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface Props {
  options: string[];
  /** true = checkboxes (varias correctas); false = radio (una correcta). */
  multiple: boolean;
  /** Índices seleccionados por el usuario. */
  selected: number[];
  /** Llamado al cambiar la selección. Omite para modo solo-lectura. */
  onSelect?: (next: number[]) => void;
  /** Si true, revela cuáles son correctas/incorrectas (modo repaso/feedback). */
  reveal?: boolean;
  /** Índices correctos. Requerido cuando reveal = true. */
  correct?: number[];
}

/**
 * Lista de opciones. Dos modos:
 *  - Interactivo (onSelect, sin reveal): seleccionable, sin colores de acierto.
 *  - Revelado (reveal + correct): muestra verde (correcta) / rojo (tu error).
 */
export default function AnswersList({
  options,
  multiple,
  selected,
  onSelect,
  reveal = false,
  correct = [],
}: Props) {
  const toggle = (i: number) => {
    if (!onSelect || reveal) return;
    if (multiple) {
      onSelect(
        selected.includes(i)
          ? selected.filter((x) => x !== i)
          : [...selected, i],
      );
    } else {
      onSelect([i]);
    }
  };

  return (
    <ul className="space-y-2">
      {options.map((opt, i) => {
        const isSelected = selected.includes(i);
        const isCorrect = correct.includes(i);

        let cls =
          "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition";
        let badge = LETTERS[i];

        if (reveal) {
          if (isCorrect) {
            cls +=
              " border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200";
          } else if (isSelected) {
            cls +=
              " border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200";
          } else {
            cls +=
              " border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
          }
        } else if (isSelected) {
          cls +=
            " border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200";
        } else {
          cls +=
            " border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700";
        }

        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              disabled={reveal || !onSelect}
              className={cls + " w-full text-left"}
              aria-pressed={isSelected}
            >
              <span
                className={
                  "mt-0.5 flex h-6 w-6 flex-none items-center justify-center text-xs font-bold " +
                  (multiple ? "rounded-md" : "rounded-full") +
                  " border " +
                  (reveal && isCorrect
                    ? "border-green-600 bg-green-600 text-white"
                    : reveal && isSelected
                      ? "border-red-600 bg-red-600 text-white"
                      : isSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400")
                }
              >
                {reveal && isCorrect ? "✓" : reveal && isSelected ? "✗" : badge}
              </span>
              <span className="flex-1 whitespace-pre-line">{opt}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
