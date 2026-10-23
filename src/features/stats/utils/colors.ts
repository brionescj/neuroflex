/**
 * Color de una serie. 0 a 7 son los puestos de la paleta categorica (definida
 * en index.css como --viz-s1 ... --viz-s8); -1 es "Otros" y -2 "Sin dato".
 * El color sigue a la entidad: el servidor entrega el puesto fijo de cada valor.
 */
export function seriesColor(slot: number): string {
  if (slot === -1) return "var(--viz-other)";
  if (slot === -2) return "var(--viz-nodata)";

  return `var(--viz-s${(((slot % 8) + 8) % 8) + 1})`;
}
