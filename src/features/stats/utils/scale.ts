import type { ChartUnit } from "../types";

/**
 * Escala del eje de valores. Siempre parte de 0 (las barras lo exigen y en las
 * lineas evita exagerar diferencias). Porcentajes y pasos tienen tope fijo.
 */
export type ValueScale = { max: number; ticks: number[] };

const STEPS = [1, 2, 2.5, 5, 10];

/** Un paso "redondo" (1, 2, 2.5, 5 x 10^k) que deja unas 4 divisiones. */
export function niceStep(max: number, divisions = 4): number {
  if (!(max > 0)) return 1;

  const raw = max / divisions;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const chosen = STEPS.find((step) => normalized <= step) ?? 10;

  return chosen * magnitude;
}

export function valueScale(unit: ChartUnit, dataMax: number): ValueScale {
  // Los porcentajes llegan a 100 como mucho; si todo es chico se amplia para que se lea.
  if (unit === "percent" && dataMax > 50) return { max: 100, ticks: [0, 25, 50, 75, 100] };
  if (unit === "steps") return { max: 4, ticks: [0, 1, 2, 3, 4] };

  const step = niceStep(dataMax);
  const rawTop = Math.max(step, Math.ceil(dataMax / step) * step);
  const top = unit === "percent" ? Math.min(rawTop, 100) : rawTop;
  const ticks: number[] = [];

  // El redondeo evita 0.30000000000000004 en pasos como 0.1.
  for (let value = 0; value <= top + step / 1000; value += step) {
    ticks.push(Math.round(value * 1e6) / 1e6);
  }

  return { max: top, ticks };
}

/** Maximo de todos los valores (0 si no hay ninguno). */
export function dataMaxOf(series: { values: (number | null)[] }[]): number {
  let max = 0;

  for (const s of series) {
    for (const value of s.values) {
      if (value !== null && value > max) max = value;
    }
  }

  return max;
}
