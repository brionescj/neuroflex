import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { activeChips, withoutChips } from "../utils/activeChips";
import {
  EMPTY_AGE,
  EMPTY_RANGE,
  MAX_COLORED_GROUPS,
  MAX_COMPARED_DIMENSIONS,
  comparedDimensions,
  comparedValues,
  parseAge,
  timeProblem,
  toggleComparedValue,
  toggleDimension,
} from "../utils/selection";
import type { Catalog, CatalogChart, DimensionId, GroupBy, OptionChoice, Selection } from "../types";
import { DateRangesEditor } from "./DateRangesEditor";
import { FilterPanel } from "./FilterPanel";
import { MANY_OPTIONS, OptionChips } from "./OptionChips";
import { StudentPicker } from "./StudentPicker";

type CompareSheetProps = {
  catalog: Catalog;
  chart: CatalogChart;
  /** Lo que hay al abrir: se edita una copia y solo «Aplicar» la entrega. */
  selection: Selection;
  onApply: (next: Selection) => void;
  onClose: () => void;
};

type TabId = "compare" | "filter";

/** Las dos formas de comparar que no son una caracteristica. */
const STUDENT_KEY = "student";
const DATE_KEY = "dateRange";

/**
 * Comparar y acotar el grafico que se esta mirando, en una hoja que sube desde abajo en el celular y
 * se centra en pantallas grandes. Dos pestañas (comparar con respecto a…, mostrar solo a quienes…)
 * para que nada obligue a desplazarse mucho, y un unico «Aplicar»: el grafico se recalcula una vez,
 * con todo lo elegido, no a cada toque.
 */
export function CompareSheet({ catalog, chart, selection, onApply, onClose }: CompareSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Selection>(selection);
  const [tab, setTab] = useState<TabId>(chart.canCompare ? "compare" : "filter");

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const compared = comparedDimensions(draft);
  const mainKey: string | null = draft.groupBy === "student" || draft.groupBy === "dateRange" ? draft.groupBy : null;

  const options: OptionChoice[] = [
    ...catalog.dimensions
      .filter((dimension) => dimension.id !== "device" || chart.supportsDevice)
      .map((dimension) => ({ value: dimension.id as string, label: dimension.label })),
    { value: STUDENT_KEY, label: "Estudiantes específicos" },
    ...(chart.usesPeriod ? [{ value: DATE_KEY, label: "Rangos de fechas" }] : []),
  ];

  function pick(value: string) {
    if (value === STUDENT_KEY || value === DATE_KEY) {
      const groupBy: GroupBy = draft.groupBy === value ? "none" : (value as GroupBy);
      // Al pasar a comparar fechas se parte con dos rangos vacios para llenar.
      const ranges = groupBy === "dateRange" && draft.ranges.length < 2 ? [EMPTY_RANGE, EMPTY_RANGE] : draft.ranges;

      setDraft({ ...draft, groupBy, alsoBy: [], ranges });
      return;
    }

    // Venir de estudiantes o fechas: se parte de cero con esta caracteristica.
    const base: Selection = mainKey ? { ...draft, groupBy: "none", alsoBy: [] } : draft;

    setDraft(toggleDimension(base, value as DimensionId));
  }

  const isOn = (value: string) => value === mainKey || compared.includes(value as DimensionId);

  const specs = compared.flatMap((dimension) => {
    const spec = catalog.filters.find((item) => item.id === dimension);

    return spec ? [{ spec, dimension, all: spec.options.map((option) => option.value) }] : [];
  });

  const total = specs.reduce(
    (product, { all, dimension }) => product * comparedValues(draft.filters, dimension, all).length,
    1,
  );

  // Lo que impide aplicar y se arregla aqui mismo.
  const problem = !parseAge(draft.age, catalog.ageLimits).ok
    ? "Corrige la edad en «Filtrar»."
    : draft.groupBy === "student" && draft.students.length === 0
      ? "Elige al menos un estudiante para compararlo."
      : draft.groupBy === "dateRange"
        ? timeProblem(draft, chart, catalog.maxPartida)
        : null;

  const filterCount = activeChips(catalog, draft, chart).filter((chip) => chip.kind === "filter").length;
  const isComparing = chart.canCompare && draft.groupBy !== "none";
  const hasAnything = activeChips(catalog, draft, chart).length > 0;

  const tabs: { id: TabId; label: string; badge: string | null }[] = [
    ...(chart.canCompare ? [{ id: "compare" as const, label: "Comparar", badge: isComparing ? "•" : null }] : []),
    { id: "filter", label: chart.canCompare ? "Filtrar" : "Acotar", badge: filterCount > 0 ? String(filterCount) : null },
  ];

  const title = chart.canCompare ? "Comparar este gráfico" : "Acotar a quiénes";

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Un toque en el fondo oscuro cierra la hoja sin aplicar.
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby="compare-sheet-title"
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none flex-col overflow-hidden rounded-t-2xl border border-zinc-700 bg-zinc-950 p-0 text-white backdrop:bg-black/70 open:flex sm:m-auto sm:max-w-lg sm:rounded-2xl"
    >
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        <h2 id="compare-sheet-title" className="min-w-0 flex-1 text-base font-semibold">
          {title}
        </h2>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          title="Cerrar sin aplicar"
          className="flex size-11 shrink-0 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/10"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div role="tablist" aria-label="Qué configurar" className="flex gap-1 border-b border-zinc-800 px-4">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`compare-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`compare-panel-${item.id}`}
            onClick={() => setTab(item.id)}
            className={cn(
              "flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors",
              tab === item.id ? "border-white text-white" : "border-transparent text-zinc-400 hover:text-zinc-200",
            )}
          >
            {item.label}
            {item.badge && (
              <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold leading-5 text-black">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        {tab === "compare" && chart.canCompare && (
          <div
            role="tabpanel"
            id="compare-panel-compare"
            aria-labelledby="compare-tab-compare"
            className="flex flex-col gap-4"
          >
            <fieldset className="min-w-0">
              <legend className="mb-1.5 text-xs font-medium text-zinc-300">Compararlo con respecto a…</legend>

              <OptionChips options={options} isOn={isOn} onToggle={pick} />

              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Marca una o más características: el gráfico dibuja un grupo por cada combinación (por ejemplo,
                «UVM · Femenino»), todos en el mismo gráfico. Hasta {MAX_COMPARED_DIMENSIONS} a la vez.
                «Estudiantes específicos» y «Rangos de fechas» se usan solos.
              </p>
            </fieldset>

            {draft.groupBy === "dateRange" && (
              <DateRangesEditor
                ranges={draft.ranges}
                min={2}
                max={catalog.maxDateRanges}
                onChange={(ranges) => setDraft({ ...draft, ranges })}
              />
            )}

            {draft.groupBy === "student" && (
              <StudentPicker
                catalog={catalog}
                value={draft.students}
                onChange={(students) => setDraft({ ...draft, students })}
              />
            )}

            {specs.map(({ spec, dimension, all }) => {
              const chosen = comparedValues(draft.filters, dimension, all);

              return (
                <fieldset key={dimension} className="min-w-0">
                  <legend className="mb-1.5 text-xs font-medium text-zinc-300">
                    ¿Qué valores de «{spec.label}» comparar?
                  </legend>

                  <OptionChips
                    options={spec.options}
                    isOn={(value) => chosen.includes(value)}
                    onToggle={(value) =>
                      setDraft({ ...draft, filters: toggleComparedValue(draft.filters, dimension, all, value) })
                    }
                    scroll={all.length > MANY_OPTIONS}
                  />

                  {chosen.length < all.length && (
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, filters: { ...draft.filters, [dimension]: [] } })}
                      className="mt-1.5 min-h-9 text-xs text-zinc-300 underline underline-offset-2 hover:text-white"
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
          </div>
        )}

        {tab === "filter" && (
          <div
            role="tabpanel"
            id="compare-panel-filter"
            aria-labelledby="compare-tab-filter"
            className="flex flex-col gap-3"
          >
            <p className="text-xs leading-relaxed text-zinc-400">
              {chart.canCompare
                ? "Compararlo solo entre quienes cumplan todo lo que marques."
                : "Este gráfico es una lista de estudiantes: no se compara por grupos. Muestra solo a quienes cumplan todo lo que marques."}
            </p>

            <FilterPanel
              catalog={catalog}
              value={draft.filters}
              age={draft.age}
              onChange={(filters) => setDraft({ ...draft, filters })}
              onAgeChange={(age) => setDraft({ ...draft, age })}
              onClear={() => {
                // Lo que se compara se elige en la otra pestaña: aqui no se toca.
                const kept: Selection["filters"] = {};

                for (const dimension of compared) {
                  if (draft.filters[dimension]) kept[dimension] = draft.filters[dimension];
                }

                setDraft({ ...draft, filters: kept, age: EMPTY_AGE });
              }}
              hideDevice={!chart.supportsDevice}
              compareBy={compared}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-zinc-800 bg-zinc-950 px-4 pb-4 pt-3">
        {problem && (
          <p role="alert" className="text-xs text-amber-200">
            {problem}
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="md"
            disabled={!hasAnything}
            onClick={() => setDraft(withoutChips(draft))}
            className="shrink-0 px-3"
          >
            Quitar todo
          </Button>

          <Button size="md" disabled={problem !== null} onClick={() => onApply(draft)} className="min-w-0 flex-1">
            Aplicar
          </Button>
        </div>
      </div>
    </dialog>
  );
}
