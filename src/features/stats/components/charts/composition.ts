/** Parte de cada valor sobre el total (0 a 1). Sin datos o sin total, todo en 0. */
export function shares(values: (number | null)[]): number[] {
  const clean = values.map((value) => (typeof value === "number" && value > 0 ? value : 0));
  const total = clean.reduce((sum, value) => sum + value, 0);

  return total === 0 ? clean.map(() => 0) : clean.map((value) => value / total);
}

/**
 * Porcentajes de cada parte con 1 decimal que suman exactamente 100,0 (resto mayor).
 * Es lo que se escribe en la torta y las barras apiladas: redondear cada parte por
 * separado dejaba sumas de 99,9 o 100,1. Sin datos o sin total, todo en 0.
 */
export function percentParts(values: (number | null)[]): number[] {
  const clean = values.map((value) => (typeof value === "number" && value > 0 ? value : 0));
  const total = clean.reduce((sum, value) => sum + value, 0);

  if (total === 0) return clean.map(() => 0);

  const exact = clean.map((value) => (value / total) * 1000);
  const tenths = exact.map((value) => Math.floor(value + 1e-9));
  let missing = 1000 - tenths.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, rest: value - (tenths[index] as number) }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index);

  for (const { index } of order) {
    if (missing <= 0) break;

    tenths[index] = (tenths[index] as number) + 1;
    missing -= 1;
  }

  return tenths.map((value) => value / 10);
}
