export type PageItem = number | "gap-start" | "gap-end";

/** Con tantas páginas o menos se muestran todas; con más, siempre 7 casillas para que la barra no salte al cambiar de página. */
const ALL_UP_TO = 7;

/**
 * Los números del pie de una tabla paginada: la primera y la última página siempre,
 * la actual con sus vecinas, y «…» donde se salta.
 */
export function pageItems(page: number, pages: number): PageItem[] {
  if (pages <= ALL_UP_TO) return Array.from({ length: pages }, (_, i) => i + 1);

  const current = Math.min(Math.max(page, 1), pages);

  if (current <= 4) return [1, 2, 3, 4, 5, "gap-end", pages];
  if (current >= pages - 3) return [1, "gap-start", pages - 4, pages - 3, pages - 2, pages - 1, pages];

  return [1, "gap-start", current - 1, current, current + 1, "gap-end", pages];
}
