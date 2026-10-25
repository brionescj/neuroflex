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
      "Paralelo 1 — Segundos (mediana)",
      "Paralelo 1 — Estudiantes considerados",
      "Paralelo 2 — Segundos (mediana)",
      "Paralelo 2 — Estudiantes considerados",
    ]);
    expect(table.rows).toEqual([
      ["1", 12.5, 4, 1234.5, 6],
      ["2", null, 0, 20, 5],
    ]);
  });

  it("de un solo estudiante no escribe cuántos estudiantes (siempre es 1)", () => {
    const table = chartTable(
      result({ series: [{ key: "a", label: "Camila", slot: 0, n: 1, values: [10, 12], ns: [1, 1] }] }),
      { single: true },
    );

    expect(table.columns).toEqual(["Nivel", "Camila — Segundos (mediana)"]);
    expect(table.rows[0]).toEqual(["1", 10]);
  });

  it("en un reparto sí deja la cantidad real detrás de cada porcentaje", () => {
    const table = chartTable(
      result({
        views: ["bars", "pie", "stacked"],
        unit: "percent",
        unitLabel: "niveles jugados",
        series: [{ key: "a", label: "Camila", slot: 0, n: 1, values: [60, 40], ns: [6, 4], part: [6, 4], total: [10, 10] }],
      }),
      { single: true },
    );

    expect(table.columns).toEqual([
      "Nivel",
      "Camila — Segundos (mediana)",
      "Camila — Niveles jugados",
      "Camila — Total de niveles jugados",
    ]);
    expect(table.rows[0]).toEqual(["1", 60, 6, 10]);
  });

  it("aprobación por nivel: columnas con nombre propio y sin repetir «Todos los estudiantes»", () => {
    const table = chartTable(
      result({
        chart: "cs-pass-rate",
        title: "Aprobación por nivel",
        unit: "percent",
        yLabel: "% que lo superó",
        partLabel: "que lo superaron",
        totalLabel: "que jugaron el nivel",
        categories: ["13", "14"],
        series: [
          { key: "all", label: "Todos los estudiantes", slot: 0, n: 38, values: [100, 75.9], ns: [29, 29], part: [29, 22], total: [29, 29] },
        ],
      }),
    );

    expect(table.columns).toEqual([
      "Nivel",
      "% que lo superó",
      "Estudiantes que lo superaron",
      "Estudiantes que jugaron el nivel",
    ]);
    expect(table.rows).toEqual([
      ["13", 100, 29, 29],
      ["14", 75.9, 22, 29],
    ]);
  });

  it("en modo cantidad no repite la parte (el valor ya es la cantidad)", () => {
    const table = chartTable(
      result({
        unit: "students",
        yLabel: "Estudiantes",
        categories: ["5"],
        series: [{ key: "all", label: "Todos los estudiantes", slot: 0, n: 38, values: [12], ns: [38], part: [12], total: [38] }],
      }),
    );

    expect(table.columns).toEqual(["Nivel", "Estudiantes", "Total de estudiantes"]);
    expect(table.rows).toEqual([["5", 12, 38]]);
  });

  it("actividad y abandono no agregan un «considerados» que repite el valor", () => {
    const table = chartTable(
      result({
        chart: "activity",
        unit: "students",
        yLabel: "Estudiantes",
        categories: ["lun"],
        series: [{ key: "all", label: "Todos los estudiantes", slot: 0, n: 5, values: [5], ns: [5] }],
      }),
    );

    expect(table.columns).toEqual(["Nivel", "Estudiantes"]);
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
