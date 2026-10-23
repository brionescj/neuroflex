/**
 * Azar con semilla para los datos de prueba: la misma semilla da siempre los
 * mismos numeros, asi correr el script dos veces deja exactamente lo mismo.
 */

export type Rng = () => number;

/** Semilla a partir de un texto (FNV-1a de 32 bits). */
export function seedFrom(text: string): number {
  let hash = 0x811c9dc5;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

/** mulberry32: rapido y suficiente para simular. Devuelve un numero en [0, 1). */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entero entre `min` y `max`, ambos incluidos. */
export function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function between(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] as T;
}

export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));

    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }

  return copy;
}

/** Normal estandar (Box-Muller). */
export function normal(rng: Rng): number {
  const u = Math.max(rng(), 1e-12);

  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Poisson (Knuth): sirve para conteos chicos como deshacer o reiniciar. */
export function poisson(rng: Rng, lambda: number): number {
  const limit = Math.exp(-lambda);
  let count = 0;
  let product = rng();

  while (product > limit && count < 100) {
    count += 1;
    product *= rng();
  }

  return count;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
