import { cn } from "@/lib/utils";

import type { Catalog, CatalogChart, GroupBy, Selection } from "../types";
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
    onChange({ ...selection, groupBy });
  }

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
          </SelectField>

          {selection.groupBy === "student" && (
            <StudentPicker
              catalog={catalog}
              value={selection.students}
              onChange={(students) => onChange({ ...selection, students })}
            />
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
        <SelectField
          label="Partida"
          value={selection.partida}
          onChange={(value) => onChange({ ...selection, partida: value as Selection["partida"] })}
        >
          {catalog.partidas.map((partida) => (
            <option key={partida.value} value={partida.value}>
              {partida.label}
            </option>
          ))}
        </SelectField>
      )}

      {chart.usesPartida && selection.partida === "all" && (
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

      {chart.usesPeriod && (
        <SelectField
          label="Período"
          value={selection.period}
          onChange={(value) => onChange({ ...selection, period: value as Selection["period"] })}
        >
          {catalog.periods.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </SelectField>
      )}
    </div>
  );
}
