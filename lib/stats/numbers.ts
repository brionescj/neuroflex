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

/**
 * Porcentajes de un reparto con 1 decimal que suman exactamente 100,0.
 * Redondear cada parte por separado puede dar 99,9 o 100,1; aqui el decimal que
 * sobra o falta se reparte entre las partes con mayor resto (metodo del resto mayor).
 * Si las partes no suman el total (hay un resto sin categoria), se redondea cada una sola.
 */
export function splitPercent(parts: number[], total: number): (number | null)[] {
  if (total <= 0) return parts.map(() => null);

  const exact = parts.map((part) => (part / total) * 1000);
  const sum = parts.reduce((acc, part) => acc + part, 0);

  if (sum !== total) return exact.map((tenths) => Math.round(tenths) / 10);

  const floors = exact.map((tenths) => Math.floor(tenths + 1e-9));
  let missing = 1000 - floors.reduce((acc, tenths) => acc + tenths, 0);
  const order = exact
    .map((tenths, index) => ({ index, rest: tenths - (floors[index] as number) }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index);

  for (const { index } of order) {
    if (missing <= 0) break;

    floors[index] = (floors[index] as number) + 1;
    missing -= 1;
  }

  return floors.map((tenths) => tenths / 10);
}
