import { describe, expect, it } from "vitest";

import { REGIONS, normalizeRegion } from "./region";

// Misma tabla en src/utils/region.test.ts: servidor y navegador deben coincidir.
const CASES: [string, string | null][] = [
  ["Metropolitana de Santiago", "Metropolitana de Santiago"],
  ["Región Metropolitana", "Metropolitana de Santiago"],
  ["region metropolitana de santiago", "Metropolitana de Santiago"],
  ["RM", "Metropolitana de Santiago"],
  ["Santiago", "Metropolitana de Santiago"],
  ["La Araucania", "La Araucanía"],
  ["Región de La Araucanía", "La Araucanía"],
  ["araucania", "La Araucanía"],
  ["Biobio", "Biobío"],
  ["Bío Bío", "Biobío"],
  ["Región del Biobío", "Biobío"],
  ["Ñuble", "Ñuble"],
  ["nuble", "Ñuble"],
  ["OHiggins", "Libertador General Bernardo O'Higgins"],
  ["O'Higgins", "Libertador General Bernardo O'Higgins"],
  ["Región de Valparaíso", "Valparaíso"],
  ["Aysen", "Aysén del General Carlos Ibáñez del Campo"],
  ["Magallanes", "Magallanes y de la Antártica Chilena"],
  ["Arica", "Arica y Parinacota"],
  ["  los lagos ", "Los Lagos"],
  ["Narnia", null],
  ["", null],
];

describe("normalizeRegion", () => {
  it.each(CASES)("%s -> %s", (input, expected) => {
    expect(normalizeRegion(input)).toBe(expected);
  });

  it("cada region oficial se reconoce a si misma", () => {
    for (const region of REGIONS) expect(normalizeRegion(region)).toBe(region);
  });

  it("son 16, sin repetidas", () => {
    expect(REGIONS).toHaveLength(16);
    expect(new Set(REGIONS).size).toBe(16);
  });
});
