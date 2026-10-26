import { cleanFilters, compareSummary, comparedDimensions } from "./selection";
import type { Catalog, CatalogChart, Filters, Selection } from "../types";

/** Una condicion activa sobre el grafico, escrita para un chip que se puede quitar con su «×». */
export type ActiveChip = {
  id: string;
  label: string;
  /** La seleccion sin esta condicion. */
  clear: (selection: Selection) => Selection;
};

/**
 * Lo que esta comparando el grafico, para mostrarlo como chip junto a el. Hoy es una sola condicion: la
 * comparacion (con sus caracteristicas y cuantos valores entran). No hay filtros aparte.
 */
export function activeChips(catalog: Catalog, selection: Selection, chart: CatalogChart): ActiveChip[] {
  if (!chart.canCompare || selection.groupBy === "none") return [];

  const compared = comparedDimensions(selection);

  return [
    {
      id: "compare",
      label: compareSummary(catalog, selection),
      clear: (current) => {
        const filters: Filters = { ...current.filters };

        // Al dejar de comparar una caracteristica, tambien se olvida cuales de sus valores se comparaban.
        for (const dimension of compared) delete filters[dimension];

        return { ...current, groupBy: "none", alsoBy: [], filters: cleanFilters(filters) };
      },
    },
  ];
}
