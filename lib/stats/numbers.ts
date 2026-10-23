/** Aritmetica simple de las estadisticas. Los vacios se devuelven como null. */

export function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Redondea a `decimals` decimales; null se queda como null. */
export function round(value: number | null, decimals = 1): number | null {
  if (value === null) return null;

  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

/** Porcentaje de `part` sobre `total`; null si no hay total. */
export function percentOf(part: number, total: number): number | null {
  return total === 0 ? null : (part / total) * 100;
}
