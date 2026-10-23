import { cn } from "@/lib/utils";

import { EMPTY_RANGE, MAX_COLORED_GROUPS, comparedDimension, comparedValues, parsePartida, toggleComparedValue } from "../utils/selection";
import type { Catalog, CatalogChart, GroupBy, Selection } from "../types";
import { DateRangesEditor } from "./DateRangesEditor";
import { MANY_OPTIONS, OptionChips } from "./OptionChips";
import { PeriodPicker } from "./PeriodPicker";
import { StudentPicker } from "./StudentPicker";

type CompareControlsProps = {
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

/** Ver el grafico completo o compararlo, mas las opciones propias del grafico. */
export function CompareControls({ catalog, chart, selection, onChange }: CompareControlsProps) {
  const comparing = selection.groupBy !== "none" && chart.canCompare;

  function setGroupBy(groupBy: GroupBy) {
    // Al pasar a comparar fechas se parte con dos rangos vacios para llenar.
    const ranges = groupBy === "dateRange" && selection.ranges.length < 2 ? [EMPTY_RANGE, EMPTY_RANGE] : selection.ranges;

    onChange({ ...selection, groupBy, ranges });
  }

  const partida = parsePartida(selection.partida, catalog.maxPartida);
  const hasPartida = partida.ok && partida.value !== null;
  const byDate = comparing && selection.groupBy === "dateRange";

  // Los valores que se pueden comparar de la caracteristica elegida (no aplica a «estudiantes específicos»).
  const dimension = comparedDimension(selection.groupBy);
  const spec = comparing && dimension ? catalog.filters.find((item) => item.id === dimension) : undefined;
  const all = spec ? spec.options.map((option) => option.value) : [];
  const compared =
    spec && dimension
      ? { spec, dimension, all, chosen: comparedValues(selection.filters, dimension, all) }
      : null;

  return (
    <div className="flex flex-col gap-4">
      {!chart.canCompare && (
        <p className="rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-zinc-300">
          Este gráfico es una lista de estudiantes: no se compara por grupos. Usa los filtros para acotarla.
        </p>
      )}

      <div
        role="radiogroup"
        aria-label="Cómo ver el gráfico"
        className={cn("grid grid-cols-2 gap-2", !chart.canCompare && "hidden")}
      >
        {[
          { value: false, label: "Verlo completo" },
          { value: true, label: "Compararlo" },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={comparing === option.value}
            onClick={() => setGroupBy(option.value ? "paralelo" : "none")}
            className={cn(
              "min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
              comparing === option.value
                ? "border-white bg-white text-black"
                : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {comparing && (
        <>
          <SelectField
            label="Comparar por"
            value={selection.groupBy}
            onChange={(value) => setGroupBy(value as GroupBy)}
          >
            {catalog.dimensions
              .filter((dimension) => dimension.id !== "device" || chart.supportsDevice)
              .map((dimension) => (
              <option key={dimension.id} value={dimension.id}>
                {dimension.label}
              </option>
            ))}
            <option value="student">Estudiantes específicos</option>
            {chart.usesPeriod && <option value="dateRange">Rango de fechas</option>}
          </SelectField>

          {byDate && (
            <DateRangesEditor
              ranges={selection.ranges}
              min={2}
              max={catalog.maxDateRanges}
              onChange={(ranges) => onChange({ ...selection, ranges })}
            />
          )}

          {selection.groupBy === "student" && (
            <StudentPicker
              catalog={catalog}
              value={selection.students}
              onChange={(students) => onChange({ ...selection, students })}
            />
          )}

          {compared && (
            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-xs font-medium text-zinc-300">¿Cuáles comparar?</legend>

              <OptionChips
                options={compared.spec.options}
                isOn={(value) => compared.chosen.includes(value)}
                onToggle={(value) =>
                  onChange({
                    ...selection,
                    filters: toggleComparedValue(selection.filters, compared.dimension, compared.all, value),
                  })
                }
                scroll={compared.all.length > MANY_OPTIONS}
              />

              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {compared.chosen.length < compared.all.length
                  ? "Quedan fuera las demás opciones y los estudiantes sin ese dato."
                  : compared.all.length > MAX_COLORED_GROUPS
                    ? `Se muestran las ${MAX_COLORED_GROUPS} con más estudiantes y el resto en «Otros». Desmarca las que no quieras comparar.`
                    : "Desmarca las que no quieras comparar."}
              </p>

              {compared.chosen.length < compared.all.length && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({ ...selection, filters: { ...selection.filters, [compared.dimension]: [] } })
                  }
                  className="mt-1 text-xs text-zinc-300 underline underline-offset-2 hover:text-white"
                >
                  Marcar todas
                </button>
              )}
            </fieldset>
          )}
        </>
      )}

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
            placeholder="Todas"
            value={selection.partida}
            aria-invalid={!partida.ok}
            onChange={(event) => onChange({ ...selection, partida: event.target.value.replace(/\D/g, "") })}
            className={cn(SELECT, !partida.ok && "border-red-400")}
          />
          <p className={cn("text-xs leading-relaxed", partida.ok ? "text-zinc-400" : "text-red-300")} role={partida.ok ? undefined : "alert"}>
            {partida.ok
              ? "Cuántas partidas de cada estudiante quieres ver (por ejemplo 4). Vacío, se usan todas."
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
