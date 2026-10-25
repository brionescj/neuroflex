import { describe, expect, it } from "vitest";

import { readPoint } from "./reading";
import type { ChartResult } from "../types";

function passRate(): ChartResult {
  return {
    chart: "cs-pass-rate",
    title: "Aprobación por nivel",
    views: ["lines", "bars"],
    exploratory: false,
    xLabel: "Nivel",
    yLabel: "% que lo superó",
    unit: "percent",
    unitLabel: "estudiantes",
    partLabel: "que lo superaron",
    totalLabel: "que jugaron el nivel",
    categories: ["13", "14"],
    series: [{ key: "all", label: "Todos los estudiantes", slot: 0, n: 38, values: [100, 75.9], ns: [29, 29], part: [29, 22], total: [29, 29] }],
    warnings: [],
    notes: [],
    studentsTotal: 38,
    generatedAt: "2026-10-25T12:00:00.000Z",
  };
}

describe("readPoint", () => {
  it("aprobación por nivel: nivel, porcentaje y cuántos de cuántos", () => {
    const result = passRate();
    const point = readPoint(result, result.series[0]!, 1, true);

    expect(point.x).toEqual({ label: "Nivel", value: "14" });
    expect(point.y).toEqual({ label: "% que lo superó", value: "75,9 %" });
    expect(point.detail).toBe("22 estudiantes de un total de 29 que jugaron el nivel");
  });

  it("un gráfico de tiempo dice con cuántos se calculó", () => {
    const result: ChartResult = {
      ...passRate(),
      chart: "cs-time",
      unit: "seconds",
      yLabel: "Segundos (mediana)",
      series: [{ key: "all", label: "Todos los estudiantes", slot: 0, n: 38, values: [12.5], ns: [31] }],
      categories: ["1"],
    };
    const point = readPoint(result, result.series[0]!, 0, true);

    expect(point.y.value).toBe("12,5 s");
    expect(point.detail).toBe("Calculado con 31 estudiantes");
  });

  it("de un solo estudiante no escribe «1 de 1»", () => {
    const result = passRate();

    expect(readPoint(result, result.series[0]!, 1, false).detail).toBeNull();
  });

  it("en modo cantidad escribe el total sin repetir la parte", () => {
    const result: ChartResult = { ...passRate(), unit: "students", yLabel: "Estudiantes" };
    const point = readPoint(result, result.series[0]!, 1, true);

    expect(point.detail).toBe("De un total de 29 estudiantes que jugaron el nivel");
  });

  it("con partes quitadas (torta y apiladas) usa el total de lo visible", () => {
    const result = passRate();
    const point = readPoint(result, result.series[0]!, 1, true, { part: 22, total: 40 });

    expect(point.detail).toBe("22 estudiantes de un total de 40 que jugaron el nivel");
  });

  it("actividad y abandono no repiten el valor como «considerados»", () => {
    const result: ChartResult = { ...passRate(), chart: "activity", unit: "students", yLabel: "Estudiantes", series: [{ key: "all", label: "Todos", slot: 0, n: 5, values: [5], ns: [5] }], categories: ["lun"] };

    expect(readPoint(result, result.series[0]!, 0, true).detail).toBeNull();
  });
});
