import { describe, expect, it } from "vitest";

import { chartTable, exportFileName, sheetName } from "./chartTable";
import type { ChartResult } from "../types";

function result(extra: Partial<ChartResult> = {}): ChartResult {
  return {
    chart: "cs-time",
    title: "Tiempo por nivel",
    views: ["lines", "bars"],
    exploratory: false,
    xLabel: "Nivel",
    yLabel: "Segundos (mediana)",
    unit: "seconds",
    unitLabel: "estudiantes",
    categories: ["1", "2"],
    series: [
      { key: "1", label: "Paralelo 1", slot: 0, n: 4, values: [12.5, null], ns: [4, 0] },
      { key: "2", label: "Paralelo 2", slot: 1, n: 6, values: [1234.5, 20], ns: [6, 5] },
    ],
    warnings: [],
    notes: [],
    studentsTotal: 10,
    generatedAt: "2026-10-21T15:00:00.000Z",
    ...extra,
  };
}

describe("chartTable", () => {
  it("deja los numeros como numeros y lo que no tiene dato como null", () => {
    const table = chartTable(result());

    expect(table.columns).toEqual([
      "Nivel",
      "Paralelo 1 (Segundos (mediana))",
      "Paralelo 1 (total de estudiantes)",
      "Paralelo 2 (Segundos (mediana))",
      "Paralelo 2 (total de estudiantes)",
    ]);
    expect(table.rows).toEqual([
      ["1", 12.5, 4, 1234.5, 6],
      ["2", null, 0, 20, 5],
    ]);
  });

  it("de un solo estudiante no escribe «total de estudiantes» (siempre es 1)", () => {
    const table = chartTable(
      result({ series: [{ key: "a", label: "Camila", slot: 0, n: 1, values: [10, 12], ns: [1, 1] }] }),
      { single: true },
    );

    expect(table.columns).toEqual(["Nivel", "Camila (Segundos (mediana))"]);
    expect(table.rows[0]).toEqual(["1", 10]);
  });

  it("en un reparto sí deja la cantidad real detrás de cada porcentaje", () => {
    const table = chartTable(
      result({
        views: ["bars", "pie", "stacked"],
        unit: "percent",
        unitLabel: "niveles jugados",
        series: [{ key: "a", label: "Camila", slot: 0, n: 1, values: [60, 40], ns: [6, 4] }],
      }),
      { single: true },
    );

    expect(table.columns).toEqual(["Nivel", "Camila (Segundos (mediana))", "Camila (total de niveles jugados)"]);
    expect(table.rows[0]).toEqual(["1", 60, 6]);
  });

  it("usa las columnas y filas de la tabla propia (lista de estudiantes)", () => {
    const table = chartTable(
      result({
        views: [],
        categories: [],
        series: [],
        table: { columns: ["Estudiante", "RUT"], rows: [["Ana Soto", "11111111-1"]] },
      }),
    );

    expect(table).toEqual({ columns: ["Estudiante", "RUT"], rows: [["Ana Soto", "11111111-1"]] });
  });
});

describe("exportFileName", () => {
  it("lleva el grafico y la fecha, sin extension", () => {
    expect(exportFileName(result(), new Date("2026-10-21T15:00:00Z"))).toBe("neuroflex-cs-time-2026-10-21");
  });
});

describe("sheetName", () => {
  it("quita los caracteres que Excel no acepta y corta a 31", () => {
    expect(sheetName("Tiempo: nivel/1 [prom]?")).toBe("Tiempo nivel 1 prom");
    expect(sheetName("x".repeat(40))).toHaveLength(31);
    expect(sheetName("///")).toBe("Datos");
  });
});
