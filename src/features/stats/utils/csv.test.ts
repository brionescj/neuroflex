import { describe, expect, it } from "vitest";

import { chartToCsv, csvFileName } from "./csv";
import type { ChartResult } from "../types";

function result(extra: Partial<ChartResult> = {}): ChartResult {
  return {
    chart: "cs-time",
    title: "Tiempo por nivel",
    kind: "lines",
    xLabel: "Nivel",
    yLabel: "Segundos (mediana)",
    unit: "seconds",
    unitLabel: "estudiantes",
    categories: ["1", "2"],
    series: [
      { key: "1", label: "Paralelo 1", slot: 0, n: 4, lowN: true, values: [12.5, null], ns: [4, 0] },
      { key: "2", label: "Paralelo 2", slot: 1, n: 6, lowN: false, values: [1234.5, 20], ns: [6, 5] },
    ],
    warnings: [],
    notes: [],
    studentsTotal: 10,
    generatedAt: "2026-10-21T15:00:00.000Z",
    ...extra,
  };
}

describe("chartToCsv", () => {
  const lines = chartToCsv(result()).replace("﻿", "").trim().split("\r\n");

  it("empieza con BOM para que Excel respete las tildes", () => {
    expect(chartToCsv(result()).startsWith("﻿")).toBe(true);
  });

  it("separa con punto y coma y usa coma decimal, sin separador de miles", () => {
    expect(lines[0]).toBe(
      "Nivel;Paralelo 1 (Segundos (mediana));Paralelo 1 (n de estudiantes);Paralelo 2 (Segundos (mediana));Paralelo 2 (n de estudiantes)",
    );
    expect(lines[1]).toBe("1;12,5;4;1234,5;6");
  });

  it("deja vacio un valor sin datos", () => {
    expect(lines[2]).toBe("2;;0;20;5");
  });

  it("neutraliza textos que Excel ejecutaria como formula", () => {
    const csv = chartToCsv(
      result({
        categories: ["=HYPERLINK(\"http://x\")", "+56 9"],
        series: [{ key: "a", label: "@grupo", slot: 0, n: 1, lowN: false, values: [1, 2], ns: [1, 1] }],
      }),
    );

    expect(csv).toContain("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csv).toContain("'+56 9");
    expect(csv).toContain("'@grupo");
  });

  it("entrecomilla lo que trae separador, comillas o saltos de linea", () => {
    const csv = chartToCsv(result({ categories: ["a;b", "c\nd"] }));

    expect(csv).toContain('"a;b"');
    expect(csv).toContain('"c\nd"');
  });
});

describe("csvFileName", () => {
  it("lleva el grafico y la fecha", () => {
    expect(csvFileName(result(), new Date("2026-10-21T15:00:00Z"))).toBe(
      "neuroflex-cs-time-2026-10-21.csv",
    );
  });
});
