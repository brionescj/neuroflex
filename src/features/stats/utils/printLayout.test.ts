import { describe, expect, it } from "vitest";

import { LETTER, MARGIN, PLOT_MAX_SHARE, SHEET_WIDTH_PX, placeSheet } from "./printLayout";

const CONTENT_WIDTH = LETTER.width - MARGIN * 2;
const PT = CONTENT_WIDTH / SHEET_WIDTH_PX;

describe("placeSheet", () => {
  it("un grafico que cabe va a su tamaño, centrado y debajo del encabezado", () => {
    const placed = placeSheet({ header: 100, plot: 300, notes: 200 });

    expect(placed.plot?.width).toBeCloseTo(CONTENT_WIDTH);
    expect(placed.plot?.height).toBeCloseTo(300 * PT);
    expect(placed.plot?.x).toBeCloseTo(MARGIN);
    expect(placed.plot?.y).toBeGreaterThan(placed.header?.y ?? 0);
    expect(placed.notes?.y).toBeGreaterThan(placed.plot?.y ?? 0);
  });

  it("un grafico muy alto se achica hasta el 40 % del alto de la hoja, sin deformarse", () => {
    const placed = placeSheet({ header: 100, plot: 900, notes: 100 });
    const plot = placed.plot;

    expect(plot?.height).toBeCloseTo(LETTER.height * PLOT_MAX_SHARE);
    expect((plot?.width ?? 0) / (plot?.height ?? 1)).toBeCloseTo(SHEET_WIDTH_PX / 900);
    expect(plot?.width).toBeLessThan(CONTENT_WIDTH);
    // Centrado en la hoja.
    expect((plot?.x ?? 0) + (plot?.width ?? 0) / 2).toBeCloseTo(LETTER.width / 2);
  });

  it("nunca pasa de la pagina, ni siquiera con mucho texto", () => {
    const placed = placeSheet({ header: 500, plot: 400, notes: 1500 });
    const boxes = [placed.header, placed.plot, placed.notes].filter((box) => box !== null);
    const bottom = Math.max(...boxes.map((box) => box.y + box.height));

    expect(bottom).toBeLessThanOrEqual(LETTER.height - MARGIN + 0.001);
    expect(placed.plot?.height ?? 0).toBeLessThanOrEqual(LETTER.height * PLOT_MAX_SHARE + 0.001);
    for (const box of boxes) expect(box.x + box.width).toBeLessThanOrEqual(LETTER.width - MARGIN + 0.001);
  });

  it("omite las partes que no llevan", () => {
    const placed = placeSheet({ header: 0, plot: 300, notes: 0 });

    expect(placed.header).toBeNull();
    expect(placed.notes).toBeNull();
    expect(placed.plot?.y).toBe(MARGIN);
  });
});
