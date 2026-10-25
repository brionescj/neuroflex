/**
 * Como se reparte el PDF de un grafico sobre hojas carta: encabezado, grafico, listas y notas,
 * uno bajo otro. El grafico nunca pasa del 40 % del alto de la hoja (se achica sin deformarse).
 * Lo normal es una sola hoja; si las listas de estudiantes no caben, el resto sigue en las
 * hojas siguientes, siempre cortando entre bloques y nunca por la mitad de una fila.
 */

/** Hoja carta en puntos (1 pt = 1/72 de pulgada). */
export const LETTER = { width: 612, height: 792 } as const;

export const MARGIN = 36;

/** Lo mas alto que puede ser el grafico, como parte del alto de la hoja. */
export const PLOT_MAX_SHARE = 0.4;

/** Ancho, en pixeles, con que se dibuja la hoja antes de pasarla al PDF. */
export const SHEET_WIDTH_PX = 720;

/**
 * Filas de una lista por trozo: asi una lista larga pasa a la hoja siguiente sin cortarse por la
 * mitad de una fila. Las tablas anchas (con textos que se parten en dos lineas) llevan menos filas.
 */
export function listRowsPerBlock(columnCount: number): number {
  return columnCount > 5 ? 6 : 12;
}

const GAP = 12;

export type Box = { x: number; y: number; width: number; height: number };

/** Una parte de la hoja ya dibujada: `plot` es el grafico (con tope de alto) y `text` todo lo demas. */
export type FlowBlock = { id: string; kind: "plot" | "text"; height: number };

export type PlacedBlock = { id: string; page: number; box: Box };

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
