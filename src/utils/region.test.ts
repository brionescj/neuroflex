import { describe, expect, it } from "vitest";

import { REGIONS, normalizeRegion } from "./region";

// Misma tabla en lib/region.test.ts: servidor y navegador deben coincidir.
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
  ["Libertador Gral. B. O'Higgins", "Libertador General Bernardo O'Higgins"],
  ["LIBERTADOR GRAL. B. O’HIGGINS", "Libertador General Bernardo O'Higgins"],
  ["Libertador General Bdo. O´Higgins", "Libertador General Bernardo O'Higgins"],
  ["Región del Libertador Bernardo O'Higgins", "Libertador General Bernardo O'Higgins"],
  ["Gral. Bernardo O'Higgins", "Libertador General Bernardo O'Higgins"],
  ["Lib. Gral. B. Ohiggins", "Libertador General Bernardo O'Higgins"],
  ["VI Región", "Libertador General Bernardo O'Higgins"],
  ["Región VI", "Libertador General Bernardo O'Higgins"],
  ["VIII", "Biobío"],
  ["8", "Biobío"],
  ["VIII Región del Bío-Bío", "Biobío"],
  ["Región del BioBio", "Biobío"],
  ["XIII Región Metropolitana", "Metropolitana de Santiago"],
  ["Región Metropolitana de Santiago de Chile", null],
  ["Metrop.", "Metropolitana de Santiago"],
  ["RM Santiago", "Metropolitana de Santiago"],
  ["IX Región de la Araucanía", "La Araucanía"],
  ["Araucnia", "La Araucanía"],
  ["Valparaizo", "Valparaíso"],
  ["Valpo", "Valparaíso"],
  ["V Región de Valparaíso", "Valparaíso"],
  ["Los Rios", "Los Ríos"],
  ["XIV Región de Los Ríos", "Los Ríos"],
  ["X Región de Los Lagos", "Los Lagos"],
  ["XVI Región de Ñuble", "Ñuble"],
  ["XV Arica y Parinacota", "Arica y Parinacota"],
  ["Aysén del Gral. Carlos Ibáñez del Campo", "Aysén del General Carlos Ibáñez del Campo"],
  ["Aysen del General Carlos Ibañez del Campo", "Aysén del General Carlos Ibáñez del Campo"],
  ["XI Región Aysén", "Aysén del General Carlos Ibáñez del Campo"],
  ["Magallanes y de la Antártica Chilena", "Magallanes y de la Antártica Chilena"],
  ["XII Región de Magallanes y la Antártica Chilena", "Magallanes y de la Antártica Chilena"],
  ["Magallanes y Antartica", "Magallanes y de la Antártica Chilena"],
  ["VII Región del Biobío", null],
  ["General", null],
  ["Carlos", null],
  ["Región", null],
  ["XX", null],
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
