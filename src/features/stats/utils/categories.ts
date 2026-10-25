import type { ChartResult } from "../types";

/**
 * Las partes de un grafico que se pueden quitar: las categorias (niveles, horas,
 * porciones de la torta...). Un resumen en tarjetas o una lista no tiene.
 */
export function canHideCategories(result: ChartResult): boolean {
  return result.categories.length >= 2 && !result.table && !result.cards;
}

/** Identifica el conjunto de categorias: si cambia (otro grafico, otros datos) lo oculto se olvida. */
export function categoriesSignature(result: ChartResult): string {
  return `${result.chart}\u0000${result.categories.join("\u0000")}`;
}

/**
 * El resultado sin las categorias ocultas. Cada valor se calcula por su cuenta,
 * asi que quitar una categoria no cambia las demas. Las categorias que quedan
 * guardan su puesto original (`categorySlots`) para no cambiar de color. Torta y
 * apiladas reparten un total: con menos partes se recalculan solas sobre lo visible.
 */
export function withoutCategories(result: ChartResult, hidden: ReadonlySet<number>): ChartResult {
  if (hidden.size === 0 || !canHideCategories(result)) return result;

  const keep = result.categories.map((_, index) => !hidden.has(index));
  const pick = <T,>(items: T[]) => items.filter((_, index) => keep[index]);

  return {
    ...result,
    categories: pick(result.categories),
    categorySlots: pick(result.categories.map((_, index) => result.categorySlots?.[index] ?? index)),
    series: result.series.map((series) => ({
      ...series,
      values: pick(series.values),
      ns: pick(series.ns),
      ...(series.part ? { part: pick(series.part) } : {}),
      ...(series.total ? { total: pick(series.total) } : {}),
    })),
  };
}

/** Oculta o muestra una categoria; la ultima visible no se puede ocultar (el grafico quedaria vacio). */
export function toggleCategory(hidden: ReadonlySet<number>, count: number, index: number): Set<number> {
  const next = new Set(hidden);

  if (next.has(index)) {
    next.delete(index);

    return next;
  }

  if (count - next.size <= 1) return next;

  next.add(index);

  return next;
}

/** La aclaracion que acompana al grafico cuando se quitaron partes. */
export function hiddenCategoriesNote(result: ChartResult, hidden: ReadonlySet<number>): string | null {
  if (hidden.size === 0 || !canHideCategories(result)) return null;

  const names = [...hidden].sort((a, b) => a - b).map((index) => result.categories[index]);

  return `Se quitaron del gráfico: ${names.join(", ")}. Las barras y líneas no cambian; en torta y apiladas los porcentajes se calculan solo con las partes que se ven.`;
}
