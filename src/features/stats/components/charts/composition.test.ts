import { describe, expect, it } from "vitest";

import { percentParts, shares } from "./composition";
import { showsCounts } from "./singleStudent";
import type { ChartResult } from "../../types";

const sum = (values: number[]) => Math.round(values.reduce((acc, value) => acc + value, 0) * 10) / 10;

describe("percentParts", () => {
  it("tres partes iguales suman 100,0 (no 99,9)", () => {
    const parts = percentParts([1, 1, 1]);

    expect(parts).toEqual([33.4, 33.3, 33.3]);
    expect(sum(parts)).toBe(100);
  });

  it("siete partes iguales suman 100,0 (no 100,1)", () => {
    expect(sum(percentParts([1, 1, 1, 1, 1, 1, 1]))).toBe(100);
  });

  it("cuatro barras como las de «Intentos para superar un nivel»", () => {
    // 77, 10, 5 y 12 niveles: redondeados por separado dan 74,0 + 9,6 + 4,8 + 11,5 = 99,9.
    const parts = percentParts([77, 10, 5, 12]);

    expect(sum(parts)).toBe(100);
  });

  it("sin datos o sin total, todo en 0", () => {
    expect(percentParts([0, 0])).toEqual([0, 0]);
    expect(percentParts([null, null])).toEqual([0, 0]);
  });

  it("coincide con la parte que dibuja shares (0 a 1) con 1 decimal de diferencia como máximo", () => {
    const values = [3, 5, 9, 1];

    percentParts(values).forEach((percent, i) => {
      expect(Math.abs(percent - (shares(values)[i] as number) * 100)).toBeLessThan(0.1 + 1e-9);
    });
  });
});

describe("showsCounts", () => {
  const base = { chart: "cs-time", views: ["bars"], unit: "seconds", unitLabel: "estudiantes" } as unknown as ChartResult;
  const share = { chart: "cs-tries", views: ["bars", "pie", "stacked"], unit: "percent", unitLabel: "niveles jugados" } as unknown as ChartResult;
  const evolution = { chart: "ev-time", views: ["lines", "bars"], unit: "seconds", unitLabel: "partidas" } as unknown as ChartResult;

  it("con un grupo siempre se muestran los totales", () => {
    expect(showsCounts(base, false)).toBe(true);
    expect(showsCounts(share, false)).toBe(true);
  });

  it("con un solo estudiante solo en los repartos: ahí es la cantidad real detrás del porcentaje", () => {
    expect(showsCounts(base, true)).toBe(false);
    expect(showsCounts(share, true)).toBe(true);
  });

  it("con un solo estudiante, la evolución en el tiempo sí dice con cuántas partidas se calculó", () => {
    expect(showsCounts(evolution, true)).toBe(true);
  });
});
