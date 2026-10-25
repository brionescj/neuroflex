/**
 * Como se reparte el PDF de un grafico sobre hojas carta: encabezado, grafico, listas y notas,
 * uno bajo otro. El grafico nunca pasa del 40 % del alto de la hoja (se achica sin deformarse).
 * Lo normal es una sola hoja; si las listas de estudiantes no caben, el resto sigue en las
 * hojas siguientes. Cada lista es una sola tabla con un solo titulo: si no cabe entera, se corta
 * entre dos filas (nunca por la mitad de una) y sigue en la hoja siguiente sin repetir el titulo.
 */

/** Hoja carta en puntos (1 pt = 1/72 de pulgada). */
export const LETTER = { width: 612, height: 792 } as const;

export const MARGIN = 36;

/** Lo mas alto que puede ser el grafico, como parte del alto de la hoja. */
export const PLOT_MAX_SHARE = 0.4;

/** Ancho, en pixeles, con que se dibuja la hoja antes de pasarla al PDF. */
export const SHEET_WIDTH_PX = 720;

const GAP = 12;

export type Box = { x: number; y: number; width: number; height: number };

/**
 * Una parte de la hoja ya dibujada: `plot` es el grafico (con tope de alto), `list` una tabla de
 * estudiantes (con el alto de cada fila, para poder cortarla entre filas) y `text` todo lo demas.
 */
export type FlowBlock =
  | { id: string; kind: "plot" | "text"; height: number }
  | { id: string; kind: "list"; height: number; rows: number[] };

/** `slice` es el tramo vertical (en pixeles de la parte dibujada) que va en esa hoja, si es solo una porcion. */
export type PlacedBlock = { id: string; page: number; box: Box; slice?: { from: number; to: number } };

/** Pone cada bloque (alto en pixeles, con la hoja dibujada a SHEET_WIDTH_PX) en su hoja y posicion. */
export function flowSheet(blocks: FlowBlock[]): PlacedBlock[] {
  const contentWidth = LETTER.width - MARGIN * 2;
  const contentHeight = LETTER.height - MARGIN * 2;
  const pt = contentWidth / SHEET_WIDTH_PX;
  const placed: PlacedBlock[] = [];
  let page = 0;
  let y = 0;

  for (const block of blocks) {
    if (block.height <= 0) continue;

    if (block.kind === "list" && block.rows.length > 0) {
      const rowsPx = block.rows.reduce((sum, h) => sum + h, 0);
      const headPx = Math.max(0, block.height - rowsPx);
      const headPt = headPx * pt;
      const firstPt = (block.rows[0] ?? 0) * pt;

      // El titulo y la cabecera nunca quedan solos al pie de una hoja: van con al menos una fila.
      if (y > 0 && y + headPt + firstPt > contentHeight) {
        page += 1;
        y = 0;
      }

      let fromPx = 0;
      let endPx = headPx;
      let usedPt = headPt;
      let count = 0;

      for (const rowPx of block.rows) {
        const rowPt = rowPx * pt;

        if (count > 0 && y + usedPt + rowPt > contentHeight) {
          placed.push({ id: block.id, page, box: { x: MARGIN, y: MARGIN + y, width: contentWidth, height: usedPt }, slice: { from: fromPx, to: endPx } });
          page += 1;
          y = 0;
          fromPx = endPx;
          usedPt = 0;
          count = 0;
        }

        usedPt += rowPt;
        endPx += rowPx;
        count += 1;
      }

      // El ultimo tramo lleva tambien el borde inferior de la tabla.
      const lastPx = block.height - fromPx;
      const lastPt = Math.max(usedPt, lastPx * pt);

      placed.push({ id: block.id, page, box: { x: MARGIN, y: MARGIN + y, width: contentWidth, height: lastPt }, slice: { from: fromPx, to: block.height } });
      y += lastPt + GAP;
      continue;
    }

    const natural = block.height * pt;
    // El grafico: como mucho el 40 % del alto de la hoja; cualquier bloque: como mucho la hoja entera.
    const cap = Math.min(contentHeight, block.kind === "plot" ? LETTER.height * PLOT_MAX_SHARE : contentHeight);
    const scale = Math.min(1, cap / natural);
    const width = contentWidth * scale;
    const height = natural * scale;

    if (y > 0 && y + height > contentHeight) {
      page += 1;
      y = 0;
    }

    // El grafico va centrado; el texto, pegado al margen.
    const x = block.kind === "plot" ? MARGIN + (contentWidth - width) / 2 : MARGIN;

    placed.push({ id: block.id, page, box: { x, y: MARGIN + y, width, height } });
    y += height + GAP;
  }

  return placed;
}
