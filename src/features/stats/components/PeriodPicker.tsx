import { cn } from "@/lib/utils";

import type { Catalog, Selection } from "../types";
import { DateRangeFields } from "./DateRangeFields";

type PeriodPickerProps = {
  catalog: Catalog;
  selection: Selection;
  /** Se pide un periodo porque se escribio una partida y todavia no se eligio. */
  required: boolean;
  onChange: (next: Selection) => void;
};

/**
 * Las ventanas de tiempo (las de siempre) y «Rango de fechas». Mientras el admin
 * no elija una, con un numero de partida ninguna aparece marcada: el boton
 * «Mostrar» espera a que la elija a conciencia.
 */
export function PeriodPicker({ catalog, selection, required, onChange }: PeriodPickerProps) {
  const options = [...catalog.periods, { value: "range" as const, label: "Rango de fechas" }];
  const shown = required && !selection.periodChosen ? null : selection.period;

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-xs text-zinc-400">Período</legend>

      <div role="radiogroup" aria-label="Período" className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={shown === option.value}
            onClick={() => onChange({ ...selection, period: option.value, periodChosen: true })}
            className={cn(
              "min-h-11 rounded-xl border px-2.5 py-2 text-left text-xs leading-snug transition-colors",
              shown === option.value
                ? "border-white bg-white font-semibold text-black"
                : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
              option.value === "range" && "col-span-2 text-center",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {selection.period === "range" && (
        <div className="mt-3">
          <DateRangeFields
            idPrefix="stats-period"
            value={selection.range}
            onChange={(range) => onChange({ ...selection, range })}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
            Se cuentan las partidas que empezaron entre esos días, ambos incluidos (hora de Chile).
          </p>
        </div>
      )}

      {required && !selection.periodChosen && (
        <p role="status" className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-200">
          Con un número de partida, elige el período (o un rango de fechas) para poder mostrar el gráfico.
          «Todo el tiempo» sirve para verla completa.
        </p>
      )}
    </fieldset>
  );
}
