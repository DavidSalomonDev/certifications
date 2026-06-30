"use client";

interface Props {
  value: number;
  onChange: (n: number) => void;
  options?: number[];
  /** Tope opcional según el tamaño del pool. */
  max?: number;
}

/** Selector de cuántas preguntas practicar (10/20/30/40/50). */
export default function NumberSelector({
  value,
  onChange,
  options = [10, 20, 30, 40, 50],
  max,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((n) => {
        const disabled = typeof max === "number" && n > max;
        const active = n === value;
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={
              "h-12 w-16 rounded-lg border text-base font-semibold transition " +
              (active
                ? "border-blue-600 bg-blue-600 text-white"
                : disabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-600"
                  : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-700")
            }
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
