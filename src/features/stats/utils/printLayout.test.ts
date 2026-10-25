import { describe, expect, it } from "vitest";

import { LETTER, MARGIN, PLOT_MAX_SHARE, SHEET_WIDTH_PX, flowSheet, listRowsPerBlock, type FlowBlock } from "./printLayout";

const CONTENT_WIDTH = LETTER.width - MARGIN * 2;
const PT = CONTENT_WIDTH / SHEET_WIDTH_PX;
const BOTTOM = LETTER.height - MARGIN;

const text = (id: string, height: number): FlowBlock => ({ id, kind: "text", height });
const plot = (height: number): FlowBlock => ({ id: "plot", kind: "plot", height });

describe("flowSheet", () => {
  it("un grafico que cabe va a su tamaño, centrado y debajo del encabezado", () => {
    const placed = flowSheet([text("header", 100), plot(300), text("notes", 200)]);
    const [header, chart, notes] = placed;

    expect(chart?.box.width).toBeCloseTo(CONTENT_WIDTH);
    expect(chart?.box.height).toBeCloseTo(300 * PT);
    expect(chart?.box.x).toBeCloseTo(MARGIN);
    expect(chart?.box.y).toBeGreaterThan(header?.box.y ?? 0);
    expect(notes?.box.y).toBeGreaterThan(chart?.box.y ?? 0);
    expect(placed.every((block) => block.page === 0)).toBe(true);
  });

  it("un grafico muy alto se achica hasta el 40 % del alto de la hoja, sin deformarse", () => {
    const chart = flowSheet([text("header", 100), plot(900), text("notes", 100)])[1];

    expect(chart?.box.height).toBeCloseTo(LETTER.height * PLOT_MAX_SHARE);
    expect((chart?.box.width ?? 0) / (chart?.box.height ?? 1)).toBeCloseTo(SHEET_WIDTH_PX / 900);
    expect(chart?.box.width).toBeLessThan(CONTENT_WIDTH);
    expect((chart?.box.x ?? 0) + (chart?.box.width ?? 0) / 2).toBeCloseTo(LETTER.width / 2);
  });

  it("el texto que no cabe sigue en la hoja siguiente, sin pasar nunca del margen", () => {
    const placed = flowSheet([text("header", 120), plot(300), text("a", 400), text("b", 400), text("c", 400)]);

    expect(Math.max(...placed.map((block) => block.page))).toBeGreaterThan(0);

    for (const block of placed) {
      expect(block.box.y + block.box.height).toBeLessThanOrEqual(BOTTOM + 0.001);
      expect(block.box.x + block.box.width).toBeLessThanOrEqual(LETTER.width - MARGIN + 0.001);
    }
  });

  it("cada hoja nueva parte desde el margen de arriba, y el orden se conserva", () => {
    const placed = flowSheet([text("a", 600), text("b", 600), text("c", 600)]);

    expect(placed.map((block) => block.id)).toEqual(["a", "b", "c"]);
    expect(placed.map((block) => block.page)).toEqual([0, 1, 2]);
    expect(placed.every((block) => block.box.y === MARGIN)).toBe(true);
  });

  it("un bloque de texto mas alto que la hoja se achica hasta caber", () => {
    const [only] = flowSheet([text("notes", 5000)]);

    expect(only?.box.height).toBeCloseTo(LETTER.height - MARGIN * 2);
  });

  it("omite los bloques vacios", () => {
    const placed = flowSheet([text("header", 0), plot(300), text("notes", 0)]);

    expect(placed.map((block) => block.id)).toEqual(["plot"]);
    expect(placed[0]?.box.y).toBe(MARGIN);
  });
});

describe("listRowsPerBlock", () => {
  it("las tablas anchas llevan menos filas por trozo que las angostas", () => {
    expect(listRowsPerBlock(7)).toBeLessThan(listRowsPerBlock(4));
    expect(listRowsPerBlock(4)).toBeGreaterThan(0);
  });
});
