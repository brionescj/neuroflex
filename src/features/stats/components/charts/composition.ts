/** Parte de cada valor sobre el total (0 a 1). Sin datos o sin total, todo en 0. */
export function shares(values: (number | null)[]): number[] {
  const clean = values.map((value) => (typeof value === "number" && value > 0 ? value : 0));
  const total = clean.reduce((sum, value) => sum + value, 0);

  return total === 0 ? clean.map(() => 0) : clean.map((value) => value / total);
}
