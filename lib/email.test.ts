import { describe, expect, it } from "vitest";

import { emailProblem, isValidEmail, normalizeEmail } from "./email";

// Misma tabla en src/utils/email.test.ts: servidor y navegador deben coincidir.
const VALID = [
  "ana@uvm.cl",
  "Ana.Perez@UVM.CL",
  "  ana@uvm.cl  ",
  "ana_perez-01@mail.santotomas.cl",
  "a@b.cl",
  "ana.perez@alumnos.uvm.cl",
  "muñoz@uvm.cl",
  "Nandu.Nuñez@UVM.cl",
  "NUÑEZ@alumno.st.cl",
  "nun\u0303ez@uvm.cl",
];

const INVALID: [input: string, message: string][] = [
  ["", "Ingresa un correo."],
  ["   ", "Ingresa un correo."],
  ["ana", "Falta el @ en el correo."],
  ["ana.uvm.cl", "Falta el @ en el correo."],
  ["ana@", "Falta el dominio después del @."],
  ["@uvm.cl", "Falta el nombre antes del @."],
  ["ana@uvm", "Falta el punto del dominio después del @ (por ejemplo, .cl o .com)."],
  ["ana@uvmcl", "Falta el punto del dominio después del @ (por ejemplo, .cl o .com)."],
  ["ana@@uvm.cl", "El correo tiene más de un @."],
  ["a@b@uvm.cl", "El correo tiene más de un @."],
  ["josé@uvm.cl", "El correo solo puede llevar letras (sin tilde, la ñ sí), números y los símbolos . _ -"],
  ["ana perez@uvm.cl", "El correo solo puede llevar letras (sin tilde, la ñ sí), números y los símbolos . _ -"],
  ["ana!@uvm.cl", "El correo solo puede llevar letras (sin tilde, la ñ sí), números y los símbolos . _ -"],
  ["juan+uni@gmail.com", "El correo solo puede llevar letras (sin tilde, la ñ sí), números y los símbolos . _ -"],
  ["ana@uvm.cl.", "El dominio después del @ no es válido (por ejemplo, uvm.cl)."],
  [".ana@uvm.cl", "El nombre antes del @ no puede empezar ni terminar con símbolos, ni tener puntos seguidos."],
  ["ana.@uvm.cl", "El nombre antes del @ no puede empezar ni terminar con símbolos, ni tener puntos seguidos."],
  ["_ana@uvm.cl", "El nombre antes del @ no puede empezar ni terminar con símbolos, ni tener puntos seguidos."],
  ["a..b@uvm.cl", "El nombre antes del @ no puede empezar ni terminar con símbolos, ni tener puntos seguidos."],
  ["ana@-uvm.cl", "El dominio después del @ no es válido (por ejemplo, uvm.cl)."],
  ["ana@uvm..cl", "El dominio después del @ no es válido (por ejemplo, uvm.cl)."],
  ["ana@.cl", "El dominio después del @ no es válido (por ejemplo, uvm.cl)."],
  ["ana@uvm.c", "El dominio después del @ no es válido (por ejemplo, uvm.cl)."],
  ["ana@uvm.c0m", "El dominio después del @ no es válido (por ejemplo, uvm.cl)."],
  ["ana@uñ.cl", "El dominio después del @ no es válido (por ejemplo, uvm.cl)."],
  ["ñ@uvm.cl.", "El dominio después del @ no es válido (por ejemplo, uvm.cl)."],
  ["ana@uvm_.cl", "El dominio después del @ no es válido (por ejemplo, uvm.cl)."],
  [`${"a".repeat(65)}@uvm.cl`, "El nombre antes del @ es demasiado largo."],
];

describe("normalizeEmail", () => {
  it("recorta y pasa a minusculas", () => {
    expect(normalizeEmail("  Ana.PEREZ@UVM.CL ")).toBe("ana.perez@uvm.cl");
  });
});

describe("emailProblem / isValidEmail", () => {
  it.each(VALID)("acepta %j", (input) => {
    expect(emailProblem(normalizeEmail(input))).toBeNull();
    expect(isValidEmail(input)).toBe(true);
  });

  it.each(INVALID)("rechaza %j con su motivo", (input, message) => {
    expect(emailProblem(normalizeEmail(input))).toBe(message);
    expect(isValidEmail(input)).toBe(false);
  });

  it("un valor que no es texto nunca es un correo", () => {
    for (const value of [undefined, null, 5, {}, ["a@b.cl"]]) {
      expect(isValidEmail(value as unknown as string)).toBe(false);
    }
  });
});
