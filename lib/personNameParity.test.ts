import { describe, expect, it } from "vitest";

import { normalizePersonName as clientNormalize, toNameCase as clientCase } from "../src/utils/personName";
import { normalizePersonName, toNameCase } from "./personName";

// El servidor no comparte codigo con el navegador: se comprueba que, ante cualquier
// texto, ambas copias de la regla entreguen lo mismo.
const SAMPLES = [
  "Camilo Andres Briones Vergara",
  "CamiLo",
  "camilo   andres  ",
  "  MARÍA JOSÉ",
  "ñuñoa",
  "de la fuente",
  "o'higgins",
  "pérez-soto",
  "ÁÉÍÓÚ üÜ",
  "",
  "   ",
  "a",
];

describe("regla de nombres: servidor y navegador coinciden", () => {
  it.each(SAMPLES)("«%s»", (sample) => {
    expect(clientCase(sample)).toBe(toNameCase(sample));
    expect(clientNormalize(sample)).toBe(normalizePersonName(sample));
  });
});
