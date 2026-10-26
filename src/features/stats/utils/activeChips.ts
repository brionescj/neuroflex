import { EMPTY_AGE, ageSummary, cleanFilters, compareSummary, comparedDimensions } from "./selection";
import type { Catalog, CatalogChart, Filters, Selection } from "../types";

/** Una condicion activa sobre el grafico, escrita para un chip que se puede quitar con su «×». */
export type ActiveChip = {
  id: string;
  kind: "compare" | "filter";
  label: string;
  /** La seleccion sin esta condicion. */
  clear: (selection: Selection) => Selection;
};

const MAX_NAMED_VALUES = 2;

/**
 * Lo que esta comparando o acotando el grafico, una condicion por chip: la comparacion (si hay), cada
 * caracteristica filtrada y la edad. Los valores de lo que se compara van dentro del chip de comparar,
 * no como filtros aparte.
 */
export function activeChips(catalog: Catalog, selection: Selection, chart: CatalogChart): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const compared = chart.canCompare ? comparedDimensions(selection) : [];

  if (chart.canCompare && selection.groupBy !== "none") {
    chips.push({
      id: "compare",
      kind: "compare",
      label: compareSummary(catalog, selection),
      clear: (current) => {
        const filters: Filters = { ...current.filters };

        // Al dejar de comparar una caracteristica, tambien se olvida cuales de sus valores se comparaban.
        for (const dimension of compared) delete filters[dimension];

        return { ...current, groupBy: "none", alsoBy: [], filters: cleanFilters(filters) };
      },
    });
  }

  for (const spec of catalog.filters) {
    if (compared.includes(spec.id)) continue;
    if (spec.id === "device" && !chart.supportsDevice) continue;

    const values = selection.filters[spec.id] ?? [];

    if (values.length === 0) continue;

    const names = values.map((value) => spec.options.find((option) => option.value === value)?.label ?? value);

    chips.push({
      id: `filter-${spec.id}`,
      kind: "filter",
      label: `${spec.label}: ${names.length <= MAX_NAMED_VALUES ? names.join(", ") : `${names.length} elegidos`}`,
      clear: (current) => ({ ...current, filters: cleanFilters({ ...current.filters, [spec.id]: [] }) }),
    });
  }

  const age = ageSummary(selection.age, catalog.ageLimits);

  if (age) {
    chips.push({ id: "age", kind: "filter", label: age, clear: (current) => ({ ...current, age: EMPTY_AGE }) });
  }

  return chips;
}

/** La seleccion sin ninguna comparacion ni filtro. */
export function withoutChips(selection: Selection): Selection {
  return { ...selection, groupBy: "none", alsoBy: [], filters: {}, age: EMPTY_AGE };
}
