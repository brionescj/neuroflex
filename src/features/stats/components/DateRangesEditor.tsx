import { Plus, X } from "lucide-react";

import { seriesColor } from "../utils/colors";
import { EMPTY_RANGE } from "../utils/selection";
import type { DateRangeInput } from "../types";
import { DateRangeFields } from "./DateRangeFields";

type DateRangesEditorProps = {
  ranges: DateRangeInput[];
  min: number;
  max: number;
  onChange: (next: DateRangeInput[]) => void;
};

/** Los rangos de fechas que se comparan: de `min` a `max`, cada uno con su color en el gráfico. */
export function DateRangesEditor({ ranges, min, max, onChange }: DateRangesEditorProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs font-medium text-zinc-300">¿Qué rangos de fechas comparar?</legend>

      <div className="flex flex-col gap-3">
        {ranges.map((range, index) => (
          <div key={index} className="rounded-xl border border-zinc-800 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-medium text-zinc-200">
                <span
                  aria-hidden="true"
                  className="viz-root inline-block size-2.5 rounded-sm"
                  style={{ background: seriesColor(index) }}
                />
                Rango {index + 1}
              </span>

              {ranges.length > min && (
                <button
                  type="button"
                  onClick={() => onChange(ranges.filter((_, i) => i !== index))}
                  aria-label={`Quitar el rango ${index + 1}`}
                  className="flex size-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              )}
            </div>

            <DateRangeFields
              idPrefix={`stats-range-${index}`}
              label={`Rango ${index + 1}`}
              value={range}
              onChange={(next) => onChange(ranges.map((item, i) => (i === index ? next : item)))}
            />
          </div>
        ))}
      </div>

      {ranges.length < max && (
        <button
          type="button"
          onClick={() => onChange([...ranges, EMPTY_RANGE])}
          className="mt-2 flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white"
        >
          <Plus aria-hidden="true" className="size-4" />
          Agregar un rango
        </button>
      )}

      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
        Cada rango es un grupo del gráfico. Con un número de partida, cada uno muestra esa partida de quienes la
        jugaron dentro de él. Hasta {max} rangos.
      </p>
    </fieldset>
  );
}
