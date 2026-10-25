import { describe, expect, it } from "vitest";

import { GENERATED_PASSWORD_LENGTH, generatePassword, passwordProblem } from "./password";

describe("passwordProblem", () => {
  it("acepta una contraseña que cumple todo", () => {
    expect(passwordProblem("Segura#2026a")).toBeNull();
  });

  it.each([
    ["Ab#1", "La contraseña debe tener al menos 8 caracteres."],
    ["Solo#letras", "La contraseña debe ser alfanumérica (letras y números)."],
    ["sinmayuscula#1", "La contraseña debe incluir al menos una mayúscula."],
    ["SinEspecial12", "La contraseña debe incluir al menos un carácter especial."],
    ["Repetida#1122", "La contraseña no puede repetir un mismo dígito de forma consecutiva."],
  ])("%s -> %s", (password, message) => {
    expect(passwordProblem(password)).toBe(message);
  });
});

describe("generatePassword", () => {
  it("siempre cumple las reglas (1000 muestras) y no usa caracteres confusos", () => {
    for (let i = 0; i < 1000; i++) {
      const password = generatePassword();

      expect(password).toHaveLength(GENERATED_PASSWORD_LENGTH);
      expect(passwordProblem(password), password).toBeNull();
      expect(password).not.toMatch(/[IlO01]/);
    }
  });

  it("cada llamada entrega una distinta", () => {
    expect(new Set(Array.from({ length: 200 }, () => generatePassword())).size).toBe(200);
  });
});
