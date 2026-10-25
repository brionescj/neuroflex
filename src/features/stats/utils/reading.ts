import type { ChartResult, ChartSeries } from "../types";
import { formatNumber, formatValue } from "./format";

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** En estos dos el valor ya es la cantidad: un «con cuántos» repetiría lo mismo. */
export function valueIsCount(result: ChartResult): boolean {
  return result.chart === "activity" || result.chart === "abandonment" || result.unit === "count";
}

/** Si el gráfico dice «una parte de un total» (22 de 29), y no solo un promedio o una mediana. */
export function hasParts(result: ChartResult): boolean {
  return result.series.some((series) => series.part !== undefined && series.total !== undefined);
}

/** El nombre de la columna de la parte: «Estudiantes que lo superaron». */
export function partHeader(result: ChartResult): string {
  const unit = capitalize(result.unitLabel);

  return result.partLabel ? `${unit} ${result.partLabel}` : unit;
}

/** El nombre de la columna del total: «Estudiantes que jugaron el nivel». */
export function totalHeader(result: ChartResult): string {
  return result.totalLabel ? `${capitalize(result.unitLabel)} ${result.totalLabel}` : `Total de ${result.unitLabel}`;
}

/** Cuando no hay parte y total: «Estudiantes considerados» (con cuantos se calculo el promedio o la mediana). */
export function consideredHeader(result: ChartResult): string {
  return `${capitalize(result.unitLabel)} considerados`;
}

/** Los datos de un punto con sus nombres: lo que se escribe al pasar el cursor. */
export type PointReading = {
  /** «Nivel» y «14»; sin eje con nombre, solo el valor. */
  x: { label: string; value: string };
  /** «% que lo superó» y «75,9 %». */
  y: { label: string; value: string };
  /** «22 estudiantes de un total de 29 que jugaron el nivel» o «Calculado con 29 estudiantes». */
  detail: string | null;
};

/**
 * Lo que dice un punto del gráfico, igual en el tooltip de barras y líneas que en la torta, las barras
 * apiladas y las tablas. `showCounts`: con un solo estudiante «1 de 1» no dice nada (ver `showsCounts`).
 * `partOf` permite reemplazar el total (torta y apiladas con partes quitadas calculan sobre lo visible).
 */
export function readPoint(
  result: ChartResult,
  series: ChartSeries,
  index: number,
  showCounts: boolean,
  partOf?: { part: number; total: number },
): PointReading {
  const value = series.values[index] ?? null;
  const part = partOf?.part ?? series.part?.[index] ?? null;
  const total = partOf?.total ?? series.total?.[index] ?? null;
  const suffix = result.totalLabel ? ` ${result.totalLabel}` : "";
  let detail: string | null = null;

  if (showCounts && !valueIsCount(result)) {
    if (part !== null && total !== null) {
      detail =
        result.unit === "percent"
          ? `${formatNumber(part)} ${result.unitLabel} de un total de ${formatNumber(total)}${suffix}`
          : `De un total de ${formatNumber(total)} ${result.unitLabel}${suffix}`;
    } else if (!hasParts(result)) {
      const n = series.ns[index] ?? 0;

      detail = n > 0 ? `Calculado con ${formatNumber(n)} ${result.unitLabel}` : null;
    }
  }

  return {
    x: { label: result.xLabel, value: result.categories[index] ?? "" },
    y: { label: result.yLabel, value: value === null ? "Sin datos" : formatValue(value, result.unit) },
    detail,
  };
}
