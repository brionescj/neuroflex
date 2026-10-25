import { cn } from "@/lib/utils";

import { parsePartida } from "../utils/selection";
import type { Catalog, CatalogChart, Selection } from "../types";
import { PeriodPicker } from "./PeriodPicker";

type ChartSettingsProps = {
  catalog: Catalog;
  chart: CatalogChart;
  selection: Selection;
  onChange: (next: Selection) => void;
};

const SELECT =
  "h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-zinc-500 scheme-dark";

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={SELECT}>
        {children}
      </select>
    </label>
  );
}

/** Lo propio del grafico elegido: sus opciones, cuantas partidas mirar y de que periodo. */
export function ChartSettings({ catalog, chart, selection, onChange }: ChartSettingsProps) {
  const partida = parsePartida(selection.partida, catalog.maxPartida);
  const hasPartida = partida.ok && partida.value !== null;
  const byDate = chart.canCompare && selection.groupBy === "dateRange";

  return (
    <div className="flex flex-col gap-4">
      {chart.options.map((option) => (
        <SelectField
          key={option.id}
          label={option.label}
          value={selection.options[option.id] ?? option.default}
          onChange={(value) =>
            onChange({ ...selection, options: { ...selection.options, [option.id]: value } })
          }
        >
          {option.choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </SelectField>
      ))}

      {chart.usesPartida && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="stats-partida" className="text-xs text-zinc-400">
            Cantidad de partidas
          </label>
          <input
            id="stats-partida"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            placeholder="Escribe un número"
            value={selection.partida}
            aria-invalid={!partida.ok}
            onChange={(event) => onChange({ ...selection, partida: event.target.value.replace(/\D/g, "") })}
            className={cn(SELECT, !partida.ok && "border-red-400")}
          />
          <p className={cn("text-xs leading-relaxed", partida.ok ? "text-zinc-400" : "text-red-300")} role={partida.ok ? undefined : "alert"}>
            {partida.ok
              ? "Cuántas partidas de cada estudiante quieres ver (por ejemplo 4). Si lo dejas vacío, se usan todas."
              : partida.message}
          </p>
        </div>
      )}

      {chart.usesPartida && hasPartida && (
        <div className="flex flex-col gap-1.5">
          <span id="stats-take-label" className="text-xs text-zinc-400">
            ¿Cuáles de esas partidas?
          </span>
          <div role="radiogroup" aria-labelledby="stats-take-label" className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "first", label: partida.value === 1 ? "La primera" : "Las primeras" },
                { value: "last", label: partida.value === 1 ? "La última" : "Las últimas" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selection.take === option.value}
                onClick={() => onChange({ ...selection, take: option.value })}
                className={cn(
                  "min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                  selection.take === option.value
                    ? "border-white bg-white text-black"
                    : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">
            {selection.take === "first"
              ? "Las más antiguas que jugó dentro del período. Quien jugó menos entra con las que jugó."
              : "Las más recientes que jugó dentro del período. Quien jugó menos entra con las que jugó."}
          </p>
        </div>
      )}

      {chart.usesPartida && partida.ok && partida.value !== 1 && (
        <SelectField
          label="Contar"
          value={selection.countBy}
          onChange={(value) => onChange({ ...selection, countBy: value as Selection["countBy"] })}
        >
          {catalog.countBy.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </SelectField>
      )}

      {chart.usesPeriod && !byDate && (
        <PeriodPicker catalog={catalog} selection={selection} required={hasPartida} onChange={onChange} />
      )}

      {chart.usesPeriod && byDate && (
        <p className="rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-zinc-300">
          Al comparar por fechas no se usa un período aparte: cada grupo trae su propio rango.
        </p>
      )}
    </div>
  );
}
