import type { ChartResult } from "../types";

/** Un grupo comparado: lo que se puede ocultar y volver a mostrar desde el grafico. */
export type GroupRef = { key: string; label: string; slot: number };

/** Los grupos de un resultado: las series o, en un resumen en tarjetas, un bloque por grupo. */
export function groupsOf(result: ChartResult): GroupRef[] {
  if (result.cards) {
    return result.cards.map((card) => ({ key: card.group, label: card.group, slot: card.slot }));
  }

  return result.series.map((series) => ({ key: series.key, label: series.label, slot: series.slot }));
}

/** Identifica el conjunto de grupos: si cambia (otra caracteristica, otros valores) lo oculto se olvida. */
export function groupsSignature(groups: GroupRef[]): string {
  return groups.map((group) => group.key).join("\u0000");
}

/**
 * El resultado sin los grupos ocultos. Cada grupo se calcula por su cuenta, asi
 * que quitar uno no cambia los valores de los demas; los colores tampoco se mueven.
 */
export function withoutGroups(result: ChartResult, hidden: ReadonlySet<string>): ChartResult {
  if (hidden.size === 0) return result;

  const next: ChartResult = {
    ...result,
    series: result.series.filter((series) => !hidden.has(series.key)),
  };

  if (result.cards) {
    next.cards = result.cards.filter((card) => !hidden.has(card.group));
  }

  // En el resumen la tabla lleva un grupo por columna (la primera es el indicador).
  if (result.table && result.cards) {
    const keep = result.table.columns.map((column, i) => i === 0 || !hidden.has(column));

    next.table = {
      columns: result.table.columns.filter((_, i) => keep[i]),
      rows: result.table.rows.map((row) => row.filter((_, i) => keep[i])),
    };
  }

  return next;
}

/** Oculta o muestra un grupo; el ultimo visible no se puede ocultar (el grafico quedaria vacio). */
export function toggleGroup(
  hidden: ReadonlySet<string>,
  groups: GroupRef[],
  key: string,
): Set<string> {
  const next = new Set(hidden);

  if (next.has(key)) {
    next.delete(key);

    return next;
  }

  const visible = groups.filter((group) => !next.has(group.key));

  if (visible.length <= 1) return next;

  next.add(key);

  return next;
}
