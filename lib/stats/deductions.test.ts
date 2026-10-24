import { describe, expect, it } from "vitest";

import { buildCatalog } from "./catalog";
import { buildChart } from "./charts";
import { deductionOf } from "./deductions";
import { parseChartRequest } from "./request";
import type { ChartId } from "./types";

describe("leyenda de deducción", () => {
  const chartIds = buildCatalog([]).games.flatMap((game) => game.charts.map((chart) => chart.id as ChartId));

  it("cada gráfico del catálogo tiene su leyenda, salvo el resumen del grupo", () => {
    const missing = chartIds.filter((id) => id !== "gen-summary" && !deductionOf(id, false));

    expect(missing).toEqual([]);
  });

  it("el resumen del grupo no lleva leyenda", () => {
    expect(chartIds).toContain("gen-summary");
    expect(deductionOf("gen-summary", false)).toBeUndefined();
    expect(deductionOf("gen-summary", true)).toBeUndefined();
  });

  it("buildChart la agrega al resultado de cada gráfico, y el resumen no la tiene", () => {
    const empty = { students: [], attempts: [], results: [], unlocks: [], caseTitles: {} };

    for (const id of chartIds) {
      const parsed = parseChartRequest({ chart: id });

      if (!parsed.ok) continue;

      const result = buildChart(parsed.def, parsed.request, empty, new Date("2026-10-21T15:00:00Z"));

      if (id === "gen-summary") expect(result.deduction).toBeUndefined();
      else expect(result.deduction, id).toBeTruthy();
    }
  });

  it("la vista de un estudiante habla de él, no del grupo", () => {
    expect(deductionOf("cs-time", true)).toMatch(/dudó/);
    expect(deductionOf("cs-time", false)).toMatch(/dudan/);
  });

  it("los gráficos de la evolución y de la ficha tienen la suya", () => {
    for (const id of ["st-time", "st-levels", "st-restarts", "ev-count", "ev-level", "ev-time", "ev-steps"] as const) {
      expect(deductionOf(id, true), id).toBeTruthy();
    }
  });
});
