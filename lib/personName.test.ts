import { describe, expect, it } from "vitest";

import { NAME_FIELDS, normalizePersonName, parseNameChanges, parsePersonName, toNameCase } from "./personName";

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

describe("parsePersonName", () => {
  it("devuelve el nombre ya normalizado", () => {
    expect(parsePersonName("Los nombres", " camiLo andres ")).toEqual({ ok: true, value: "Camilo Andres" });
  });

  it("rechaza vacios, numeros, simbolos, textos largos y lo que no es texto", () => {
    expect(parsePersonName("El apellido paterno", "  ")).toEqual({
      ok: false,
      message: "El apellido paterno no puede quedar vacío.",
    });

    for (const raw of ["Ana1", "Ana_", "1Ana", "-Ana", "a".repeat(61), null, 3]) {
      expect(parsePersonName("X", raw).ok, String(raw)).toBe(false);
    }
  });
});

describe("parseNameChanges", () => {
  it("solo devuelve los campos que vienen", () => {
    expect(parseNameChanges({})).toEqual({ ok: true, set: {} });
    expect(parseNameChanges({ firstName: "ana", rut: "1-9" })).toEqual({ ok: true, set: { firstName: "Ana" } });
  });

  it("el primer error corta", () => {
    expect(parseNameChanges({ firstName: "ana", maternalLastName: "" })).toEqual({
      ok: false,
      message: "El apellido materno no puede quedar vacío.",
    });
  });

  it("los campos son los tres de la ficha", () => {
    expect([...NAME_FIELDS]).toEqual(["firstName", "paternalLastName", "maternalLastName"]);
  });
});
