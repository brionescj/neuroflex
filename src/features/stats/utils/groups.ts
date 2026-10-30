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

  // Si la tabla dice de que grupo es cada fila, se quitan las filas de los grupos ocultos.
  if (result.table?.rowGroups) {
    const groupOf = result.table.rowGroups;

    next.table = {
      ...result.table,
      rows: result.table.rows.filter((_, i) => !hidden.has(groupOf[i] as string)),
      rowGroups: groupOf.filter((group) => !hidden.has(group)),
    };
  } else if (result.table && result.cards) {
    // En el resumen la tabla lleva un grupo por columna (la primera es el indicador).
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

/** Un grupo comparado («UVM») y los bloques que le pertenecen. */
export type SubgroupRef = { label: string; slot: number; keys: string[] };

/** Los grupos comparados de un resultado en tarjetas donde cada bloque es un caso dentro de un grupo. */
export function subgroupsOf(result: ChartResult): SubgroupRef[] {
  const found = new Map<string, SubgroupRef>();

  for (const card of result.cards ?? []) {
    if (card.subgroup === undefined) continue;

    const entry = found.get(card.subgroup) ?? { label: card.subgroup, slot: card.slot, keys: [] };

    entry.keys.push(card.group);
    found.set(card.subgroup, entry);
  }

  return [...found.values()];
}

/**
 * Quita de una vez todos los bloques de un grupo, o los vuelve a poner si ya estaban todos quitados.
 * Si quitarlos dejara el grafico vacio, no cambia nada.
 */
export function toggleSubgroup(
  hidden: ReadonlySet<string>,
  groups: GroupRef[],
  keys: readonly string[],
): Set<string> {
  const next = new Set(hidden);

  if (keys.every((key) => next.has(key))) {
    for (const key of keys) next.delete(key);

    return next;
  }

  for (const key of keys) next.add(key);

  return groups.some((group) => !next.has(group.key)) ? next : new Set(hidden);
}

/** Deja a la vista solo los bloques indicados. */
export function showOnly(groups: GroupRef[], keys: readonly string[]): Set<string> {
  const keep = new Set(keys);

  return new Set(groups.filter((group) => !keep.has(group.key)).map((group) => group.key));
}
