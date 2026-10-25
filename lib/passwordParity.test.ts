import { describe, expect, it } from "vitest";

import { generatePassword as clientGenerate, passwordProblem } from "../src/utils/password";
import { generatePassword, validatePasswordStrength } from "./password";

// El servidor no comparte codigo con el navegador: se comprueba que ambas copias de
// las reglas den el mismo veredicto y el mismo mensaje, y que cada generador produzca
// contraseñas que la otra parte acepta.
const SAMPLES = [
  "Segura#2026a",
  "Ab#1",
  "Solo#letras",
  "12345678#",
  "sinmayuscula#1",
  "SinEspecial12",
  "Repetida#1122",
  "Aa#1b2c3",
  "Aa#11b22",
  "",
  "        ",
  "Mayus#1Mayus#2",
];

describe("reglas de contraseña: servidor y navegador coinciden", () => {
  it.each(SAMPLES)("«%s»", (sample) => {
    expect(passwordProblem(sample)).toBe(validatePasswordStrength(sample));
  });

  it("lo que genera el navegador lo acepta el servidor, y al reves", () => {
    for (let i = 0; i < 200; i++) {
      expect(validatePasswordStrength(clientGenerate())).toBeNull();
      expect(passwordProblem(generatePassword())).toBeNull();
    }
  });
});
