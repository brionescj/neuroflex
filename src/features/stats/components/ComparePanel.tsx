import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  EMPTY_AGE,
  EMPTY_RANGE,
  MAX_COLORED_GROUPS,
  MAX_COMPARED_DIMENSIONS,
  compareSummary,
  comparedDimensions,
  comparedValues,
  filtersSummary,
  toggleComparedValue,
  toggleDimension,
} from "../utils/selection";
import type { Catalog, CatalogChart, DimensionId, GroupBy, OptionChoice, Selection } from "../types";
import { DateRangesEditor } from "./DateRangesEditor";
import { FilterPanel } from "./FilterPanel";
import { MANY_OPTIONS, OptionChips } from "./OptionChips";
import { StudentPicker } from "./StudentPicker";

type ComparePanelProps = {
  catalog: Catalog;
  chart: CatalogChart;
  selection: Selection;
  onChange: (next: Selection) => void;
  open: boolean;
  onToggle: () => void;
};

const PANEL_ID = "stats-compare-panel";

/** Las dos formas de comparar que no son una caracteristica. */
const STUDENT_KEY = "student";
const DATE_KEY = "dateRange";

/**
 * Comparar el grafico que se esta mirando: con respecto a una o varias
 * caracteristicas (cada combinacion es una linea o barra del mismo grafico),
 * a estudiantes concretos o a rangos de fechas. Aqui mismo se acota a quienes
 * entran: los filtros son parte de la comparacion, no una seccion aparte.
 */
export function ComparePanel({ catalog, chart, selection, onChange, open, onToggle }: ComparePanelProps) {
  const compared = comparedDimensions(selection);
  const mainKey: string | null = selection.groupBy === "student" || selection.groupBy === "dateRange" ? selection.groupBy : null;

  const options: OptionChoice[] = [
    ...catalog.dimensions
      .filter((dimension) => dimension.id !== "device" || chart.supportsDevice)
      .map((dimension) => ({ value: dimension.id as string, label: dimension.label })),
    { value: STUDENT_KEY, label: "Estudiantes específicos" },
    ...(chart.usesPeriod ? [{ value: DATE_KEY, label: "Rangos de fechas" }] : []),
  ];

  function pick(value: string) {
    if (value === STUDENT_KEY || value === DATE_KEY) {
      const groupBy: GroupBy = selection.groupBy === value ? "none" : (value as GroupBy);
      // Al pasar a comparar fechas se parte con dos rangos vacios para llenar.
      const ranges =
        groupBy === "dateRange" && selection.ranges.length < 2 ? [EMPTY_RANGE, EMPTY_RANGE] : selection.ranges;

      onChange({ ...selection, groupBy, alsoBy: [], ranges });
      return;
    }

    // Venir de estudiantes o fechas: se parte de cero con esta caracteristica.
    const base: Selection = mainKey ? { ...selection, groupBy: "none", alsoBy: [] } : selection;

    onChange(toggleDimension(base, value as DimensionId));
  }

  const isOn = (value: string) => value === mainKey || compared.includes(value as DimensionId);

  const specs = compared.flatMap((dimension) => {
    const spec = catalog.filters.find((item) => item.id === dimension);

    return spec ? [{ spec, dimension, all: spec.options.map((option) => option.value) }] : [];
  });

  const total = specs.reduce((product, { all, dimension }) => product * comparedValues(selection.filters, dimension, all).length, 1);

  const summary = [
    chart.canCompare ? compareSummary(catalog, selection) : null,
    filtersSummary(catalog, selection.filters, selection.age, compared),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl border border-zinc-700">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">
            {chart.canCompare ? "Comparar este gráfico" : "Acotar a quiénes"}
          </span>
          <span className="block truncate text-xs text-zinc-400">{summary}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")}
        />
      </button>

      <div id={PANEL_ID} className={cn("flex-col gap-4 px-3 pb-3", open ? "flex" : "hidden")}>
        {chart.canCompare ? (
          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-xs font-medium text-zinc-300">Compararlo con respecto a…</legend>

            <OptionChips options={options} isOn={isOn} onToggle={pick} />

            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              Marca una o más características: el gráfico dibuja un grupo por cada combinación (por ejemplo,
              «UVM · Femenino»), todos en el mismo gráfico. Hasta {MAX_COMPARED_DIMENSIONS} a la vez.
              «Estudiantes específicos» y «Rangos de fechas» se usan solos.
            </p>
          </fieldset>
        ) : (
          <p className="rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-zinc-300">
            Este gráfico es una lista de estudiantes: no se compara por grupos. Acótala aquí abajo.
          </p>
        )}

        {chart.canCompare && selection.groupBy === "dateRange" && (
          <DateRangesEditor
            ranges={selection.ranges}
            min={2}
            max={catalog.maxDateRanges}
            onChange={(ranges) => onChange({ ...selection, ranges })}
          />
        )}

        {chart.canCompare && selection.groupBy === "student" && (
          <StudentPicker
            catalog={catalog}
            value={selection.students}
            onChange={(students) => onChange({ ...selection, students })}
          />
        )}

        {chart.canCompare &&
          specs.map(({ spec, dimension, all }) => {
            const chosen = comparedValues(selection.filters, dimension, all);

            return (
              <fieldset key={dimension} className="min-w-0">
                <legend className="mb-1.5 text-xs font-medium text-zinc-300">
                  ¿Qué valores de «{spec.label}» comparar?
                </legend>

                <OptionChips
                  options={spec.options}
                  isOn={(value) => chosen.includes(value)}
                  onToggle={(value) =>
                    onChange({
                      ...selection,
                      filters: toggleComparedValue(selection.filters, dimension, all, value),
                    })
                  }
                  scroll={all.length > MANY_OPTIONS}
                />

                {chosen.length < all.length && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...selection, filters: { ...selection.filters, [dimension]: [] } })}
                    className="mt-1.5 text-xs text-zinc-300 underline underline-offset-2 hover:text-white"
                  >
                    Marcar todos
                  </button>
                )}
              </fieldset>
            );
          })}

        {specs.length > 0 && (
          <p className="text-xs leading-relaxed text-zinc-400">
            {total > MAX_COLORED_GROUPS
              ? `Salen hasta ${total} combinaciones: se muestran las ${MAX_COLORED_GROUPS} con más estudiantes y el resto en «Otros». Desmarca valores para ver menos.`
              : "Quienes no tengan alguna de estas características en su ficha aparecen como «Sin dato»."}
          </p>
        )}

        <div className="flex flex-col gap-2 border-t border-zinc-800 pt-4">
          <h3 className="text-xs font-medium text-zinc-300">
            {chart.canCompare ? "Compararlo solo entre quienes…" : "Mostrar solo a quienes…"}
          </h3>

          <FilterPanel
            catalog={catalog}
            value={selection.filters}
            age={selection.age}
            onChange={(filters) => onChange({ ...selection, filters })}
            onAgeChange={(age) => onChange({ ...selection, age })}
            onClear={() => {
              // Lo que se compara se elige arriba: aqui no se toca.
              const kept: Selection["filters"] = {};

              for (const dimension of compared) {
                if (selection.filters[dimension]) kept[dimension] = selection.filters[dimension];
              }

              onChange({ ...selection, filters: kept, age: EMPTY_AGE });
            }}
            hideDevice={!chart.supportsDevice}
            compareBy={compared}
          />
        </div>
      </div>
    </div>
  );
}
