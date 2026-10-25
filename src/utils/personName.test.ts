import { describe, expect, it } from "vitest";

import { normalizePersonName, toNameCase } from "./personName";

// Misma tabla en lib/personName.test.ts: servidor y navegador deben coincidir.
const CASES: [string, string][] = [
  ["Camilo Andres Briones Vergara", "Camilo Andres Briones Vergara"],
  ["CamiLo", "Camilo"],
  ["Camilo andres", "Camilo Andres"],
  ["CAMILO ANDRES", "Camilo Andres"],
  ["camilo andres", "Camilo Andres"],
  ["maría josé", "María José"],
  ["MARÍA JOSÉ", "María José"],
  ["ñuñoa", "Ñuñoa"],
  ["ÑANCO", "Ñanco"],
  ["de la fuente", "De La Fuente"],
  ["o'higgins", "O'Higgins"],
  ["pérez-soto", "Pérez-Soto"],
  ["", ""],
];

describe("toNameCase", () => {
  it.each(CASES)("%s -> %s", (input, expected) => {
    expect(toNameCase(input)).toBe(expected);
  });

  it("conserva los espacios mientras se escribe (no recorta)", () => {
    expect(toNameCase("camilo ")).toBe("Camilo ");
    expect(toNameCase("camilo a")).toBe("Camilo A");
  });
});

describe("normalizePersonName", () => {
  it("recorta y junta los espacios repetidos", () => {
    expect(normalizePersonName("  camilo    ANDRES  ")).toBe("Camilo Andres");
  });
});
