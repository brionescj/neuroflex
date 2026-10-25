import { describe, expect, it } from "vitest";

import { GENERATED_PASSWORD_LENGTH, generatePassword, validatePasswordStrength } from "./password";

describe("generatePassword", () => {
  it("siempre cumple las reglas de contraseña (1000 muestras)", () => {
    for (let i = 0; i < 1000; i++) {
      const password = generatePassword();

      expect(password).toHaveLength(GENERATED_PASSWORD_LENGTH);
      expect(validatePasswordStrength(password), password).toBeNull();
    }
  });

  it("no usa caracteres que se confunden al leerlos (I, l, O, 0, 1)", () => {
    for (let i = 0; i < 300; i++) expect(generatePassword()).not.toMatch(/[IlO01]/);
  });

  it("no repite: cada llamada entrega una distinta", () => {
    expect(new Set(Array.from({ length: 200 }, () => generatePassword())).size).toBe(200);
  });

  it("si el azar arma dos digitos iguales juntos, lo vuelve a intentar", () => {
    // Un azar que siempre elige el indice 0 daria "2" y "2" juntos: nunca debe devolverlos.
    let calls = 0;
    const password = generatePassword((max) => {
      calls += 1;

      // Las primeras 60 llamadas (varios intentos) elijen siempre 0; despues, valores variados.
      return calls <= 60 ? 0 : (calls * 7) % max;
    });

    expect(validatePasswordStrength(password)).toBeNull();
    expect(calls).toBeGreaterThan(60);
  });
});
