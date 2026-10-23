import { describe, expect, it } from "vitest";

import {
  emailProblem,
  isValidEmail,
  normalizeEmail,
  optionalEmailProblem,
  sanitizeEmailInput,
} from "./email";

// Misma tabla en lib/email.test.ts: servidor y navegador deben coincidir.
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
});

describe("optionalEmailProblem", () => {
  it("vacio esta bien; con texto debe ser valido", () => {
    expect(optionalEmailProblem("")).toBeNull();
    expect(optionalEmailProblem("   ")).toBeNull();
    expect(optionalEmailProblem("Ana@UVM.cl")).toBeNull();
    expect(optionalEmailProblem("ana@uvm")).toBe(
      "Falta el punto del dominio después del @ (por ejemplo, .cl o .com).",
    );
  });
});

describe("sanitizeEmailInput (lo que se va escribiendo)", () => {
  it("pasa todo a minusculas", () => {
    expect(sanitizeEmailInput("ANA.Perez@UVM.CL")).toBe("ana.perez@uvm.cl");
  });

  it("deja entrar la ñ antes del @, pero no tildes, espacios ni simbolos", () => {
    expect(sanitizeEmailInput("muñoz")).toBe("muñoz");
    expect(sanitizeEmailInput("MUÑOZ@uvm.cl")).toBe("muñoz@uvm.cl");
    expect(sanitizeEmailInput("ana@uñ.cl")).toBe("ana@u.cl");
    expect(sanitizeEmailInput("José Pérez")).toBe("josprez");
    expect(sanitizeEmailInput("ana perez!#$%&*()=?¿/\\,;:'\"")).toBe("anaperez");
    expect(sanitizeEmailInput("ana@uvm.cl ")).toBe("ana@uvm.cl");
  });

  it("deja pasar lo que un correo institucional si lleva", () => {
    expect(sanitizeEmailInput("ana_perez-01.x@mail.uvm.cl")).toBe("ana_perez-01.x@mail.uvm.cl");
  });

  it("el + no entra, ni antes ni despues del @", () => {
    expect(sanitizeEmailInput("juan+uni@gmail.com")).toBe("juanuni@gmail.com");
    expect(sanitizeEmailInput("juan@gmail+x.com")).toBe("juan@gmailx.com");
  });

  it("solo admite un @, y tras el @ no cabe _", () => {
    expect(sanitizeEmailInput("ana@@uvm.cl")).toBe("ana@uvm.cl");
    expect(sanitizeEmailInput("ana@uvm@cl")).toBe("ana@uvmcl");
    expect(sanitizeEmailInput("ana@uvm_x-y.cl")).toBe("ana@uvmx-y.cl");
  });

  it("lo que ya esta limpio no cambia, y el vacio sigue vacio", () => {
    expect(sanitizeEmailInput("ana@")).toBe("ana@");
    expect(sanitizeEmailInput("@")).toBe("@");
    expect(sanitizeEmailInput("")).toBe("");
  });

  it("siempre devuelve algo que emailProblem no rechaza por caracteres", () => {
    for (const typed of ["Ñandú@Corréo.CL", "a b@c d.cl", "ÁÉÍ@@x..cl", "ana_x@x_y.cl"]) {
      expect(emailProblem(sanitizeEmailInput(typed)) ?? "").not.toMatch(/solo puede llevar/);
    }
  });
});
