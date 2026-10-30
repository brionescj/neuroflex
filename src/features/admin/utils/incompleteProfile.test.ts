import { describe, expect, it } from "vitest";

import type { Student } from "@/types";

import { contactLabel, matchesContactFilter, missingProfileFields, studentsWithMissingData } from "./incompleteProfile";

const complete: Student = {
  rut: "12345678-5",
  firstName: "Ana",
  paternalLastName: "Soto",
  maternalLastName: "Pérez",
  paralelo: 1,
  entryYear: 2026,
  birthDate: "2001-05-17",
  studyShift: "day",
  gender: "female",
  university: "uvm",
  enabled: true,
  registered: true,
  email: "ana@uvm.cl",
  celular: "12345678",
  comuna: "Concepción",
  region: "Biobío",
  avatarId: "cat",
  isDeleted: false,
};

describe("missingProfileFields", () => {
  it("una ficha completa no tiene faltantes", () => {
    expect(missingProfileFields(complete)).toEqual([]);
  });

  it("nombra lo que falta y separa lo que completa el estudiante de lo que registra un administrador", () => {
    const missing = missingProfileFields({ ...complete, email: undefined, comuna: undefined, celular: undefined, university: undefined });

    expect(missing.map((field) => field.label)).toEqual(["Correo", "Comuna", "Celular", "Universidad"]);
    expect(missing.filter((field) => field.byStudent).map((field) => field.key)).toEqual(["email", "comuna"]);
    expect(missing.filter((field) => !field.byStudent).map((field) => field.key)).toEqual(["celular", "university"]);
  });

  it("un texto en blanco cuenta como faltante; «prefiero no decir» como género, no", () => {
    expect(missingProfileFields({ ...complete, email: "   ", region: "" }).map((field) => field.key)).toEqual(["email", "region"]);
    expect(missingProfileFields({ ...complete, gender: "undisclosed" })).toEqual([]);
  });

  it("un estudiante recién cargado solo con nombre y RUT tiene los 8 datos pendientes", () => {
    const bare: Student = {
      rut: complete.rut,
      firstName: "Ana",
      paternalLastName: "Soto",
      maternalLastName: "Pérez",
      paralelo: 1,
      entryYear: 2026,
      enabled: true,
      registered: false,
      avatarId: "cat",
      isDeleted: false,
    };

    expect(missingProfileFields(bare)).toHaveLength(8);
  });
});

describe("studentsWithMissingData", () => {
  it("lista solo a los habilitados con algún faltante", () => {
    const list = studentsWithMissingData([
      complete,
      { ...complete, rut: "1-9", email: undefined },
      { ...complete, rut: "2-7", email: undefined, enabled: false },
      { ...complete, rut: "3-5", email: undefined, isDeleted: true },
    ]);

    expect(list.map((entry) => entry.student.rut)).toEqual(["1-9"]);
    expect(list[0]?.missing.map((field) => field.key)).toEqual(["email"]);
  });
});

describe("contacto", () => {
  it("sin marca es «Falta contactar»", () => {
    expect(contactLabel(false)).toBe("Falta contactar");
    expect(contactLabel(true)).toBe("Contactado");
    expect(matchesContactFilter(complete, "pending")).toBe(true);
    expect(matchesContactFilter(complete, "contacted")).toBe(false);
    expect(matchesContactFilter({ ...complete, contacted: false }, "pending")).toBe(true);
  });

  it("«Contactado» solo entra en su filtro, y «Todos» deja pasar a ambos", () => {
    const contacted = { ...complete, contacted: true };

    expect(matchesContactFilter(contacted, "contacted")).toBe(true);
    expect(matchesContactFilter(contacted, "pending")).toBe(false);
    expect(matchesContactFilter(contacted, "all")).toBe(true);
    expect(matchesContactFilter(complete, "all")).toBe(true);
  });
});
