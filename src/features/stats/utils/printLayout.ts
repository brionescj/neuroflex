/**
 * Como se reparte una hoja carta en el PDF de un grafico: encabezado, grafico y notas, uno bajo
 * otro. El grafico nunca pasa del 40 % del alto de la hoja (se achica sin deformarse) y todo
 * cabe en una sola pagina.
 */

/** Hoja carta en puntos (1 pt = 1/72 de pulgada). */
export const LETTER = { width: 612, height: 792 } as const;

export const MARGIN = 36;

/** Lo mas alto que puede ser el grafico, como parte del alto de la hoja. */
export const PLOT_MAX_SHARE = 0.4;

/** Ancho, en pixeles, con que se dibuja la hoja antes de pasarla al PDF. */
export const SHEET_WIDTH_PX = 720;

/** Marca de cada parte de la hoja, para medirlas y pasarlas al PDF una por una. */
export const SHEET_PARTS = { header: "header", plot: "plot", notes: "notes" } as const;

const GAP = 14;

export type Box = { x: number; y: number; width: number; height: number };

export type SheetPlacement = { header: Box | null; plot: Box | null; notes: Box | null };

/** Alto (en pixeles, con la hoja dibujada a SHEET_WIDTH_PX) de cada parte; 0 si no lleva. */
export type SheetHeights = { header: number; plot: number; notes: number };

export function placeSheet(heights: SheetHeights): SheetPlacement {
  const contentWidth = LETTER.width - MARGIN * 2;
  const contentHeight = LETTER.height - MARGIN * 2;
  const pt = contentWidth / SHEET_WIDTH_PX;

  // El grafico: nunca mas del 40 % del alto de la hoja, achicado en ancho y alto por igual.
  const plotNatural = heights.plot * pt;
  const plotScale = plotNatural > 0 ? Math.min(1, (LETTER.height * PLOT_MAX_SHARE) / plotNatural) : 1;

  const sizes = {
    header: { width: contentWidth, height: heights.header * pt },
    plot: { width: contentWidth * plotScale, height: plotNatural * plotScale },
    notes: { width: contentWidth, height: heights.notes * pt },
  };
  const present = (Object.keys(sizes) as (keyof typeof sizes)[]).filter((key) => heights[key] > 0);
  const gaps = Math.max(0, present.length - 1) * GAP;
  const total = present.reduce((sum, key) => sum + sizes[key].height, 0);

  // Si aun asi no cabe en la pagina, se achica todo por igual.
  const fit = total + gaps > contentHeight ? (contentHeight - gaps) / total : 1;
  const placement: SheetPlacement = { header: null, plot: null, notes: null };
  let y = MARGIN;

  for (const key of present) {
    const width = sizes[key].width * fit;
    const height = sizes[key].height * fit;

    // El grafico va centrado; el texto, pegado al margen.
    placement[key] = { x: key === "plot" ? MARGIN + (contentWidth - width) / 2 : MARGIN, y, width, height };
    y += height + GAP;
  }

  return placement;
}
