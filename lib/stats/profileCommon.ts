import { round } from "./numbers";
import type { ChartId, ChartResult } from "./types";

/** Piezas que comparten la ficha de desempeno y la evolucion de un estudiante. */

export const DAY_MS = 24 * 60 * 60 * 1000;

export const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

export const SECONDS = (value: number | null) =>
  value === null ? "Sin datos" : `${String(round(value, 1)).replace(".", ",")} s`;

export const DECIMAL = (value: number | null, digits = 1) =>
  value === null ? "Sin datos" : String(round(value, digits)).replace(".", ",");

/** Un grafico vacio de un solo estudiante, listo para rellenar. */
export function emptyResult(chart: ChartId, title: string, now: Date): ChartResult {
  return {
    chart,
    title,
    views: [],
    exploratory: false,
    xLabel: "",
    yLabel: "",
    unit: "students",
    unitLabel: "estudiantes",
    categories: [],
    series: [],
    warnings: [],
    notes: [],
    studentsTotal: 1,
    generatedAt: now.toISOString(),
  };
}
