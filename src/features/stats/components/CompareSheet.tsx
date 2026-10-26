import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";

import {
  EMPTY_AGE,
  EMPTY_RANGE,
  MAX_COLORED_GROUPS,
  MAX_COMPARED_DIMENSIONS,
  cleanFilters,
  comparedDimensions,
  comparedValues,
  timeProblem,
  toggleComparedValue,
  toggleDimension,
} from "../utils/selection";
import type { Catalog, CatalogChart, DimensionId, GroupBy, OptionChoice, Selection } from "../types";
import { DateRangesEditor } from "./DateRangesEditor";
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

/** Las dos formas de comparar que no son una caracteristica. */
const STUDENT_KEY = "student";
const DATE_KEY = "dateRange";

/**
 * Comparar el grafico que se esta mirando, en una hoja que sube desde abajo en el celular y se
 * centra en pantallas grandes: con respecto a una o varias caracteristicas (cada combinacion es un
 * grupo del mismo grafico), a estudiantes concretos o a rangos de fechas, y cuales valores de cada
 * caracteristica entran. Un unico «Aplicar»: el grafico se recalcula una vez, con todo lo elegido,
 * no a cada toque. No hay filtros aparte: lo unico que acota es elegir que valores se comparan.
 */
export function CompareSheet({ catalog, chart, selection, onApply, onClose }: CompareSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Selection>(selection);

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
  const problem =
    draft.groupBy === "student" && draft.students.length === 0
      ? "Elige al menos un estudiante para compararlo."
      : draft.groupBy === "dateRange"
        ? timeProblem(draft, chart, catalog.maxPartida)
        : null;

  // Solo se guardan los valores de lo que se compara: no queda ningun filtro suelto sin forma de verlo.
  function apply() {
    const filters: Selection["filters"] = {};

    for (const dimension of comparedDimensions(draft)) {
      if (draft.filters[dimension]) filters[dimension] = draft.filters[dimension];
    }

    onApply({ ...draft, filters: cleanFilters(filters), age: EMPTY_AGE });
  }

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
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 pb-2 pt-3">
        <h2 id="compare-sheet-title" className="min-w-0 flex-1 text-base font-semibold">
          Comparar este gráfico
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

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4">
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
            disabled={draft.groupBy === "none"}
            onClick={() => setDraft({ ...draft, groupBy: "none", alsoBy: [], filters: {} })}
            className="shrink-0 px-3"
          >
            Quitar comparación
          </Button>

          <Button size="md" disabled={problem !== null} onClick={apply} className="min-w-0 flex-1">
            Aplicar
          </Button>
        </div>
      </div>
    </dialog>
  );
}
