import { describe, expect, it } from "vitest";

import { GENDERS, UNIVERSITIES, parseStudentDetails } from "./studentFields";

const NOW = new Date("2026-10-21T12:00:00Z");

describe("parseStudentDetails", () => {
  it("guarda los campos con valor, recortados", () => {
    const result = parseStudentDetails(
      {
        ciudad: "  Temuco ",
        region: "La Araucanía",
        celular: "12345678",
        email: " ana@correo.cl ",
        gender: "female",
        university: "santo-tomas",
        birthDate: "2001-03-15",
      },
      { now: NOW },
    );

    expect(result).toEqual({
      ok: true,
      set: {
        ciudad: "Temuco",
        region: "La Araucanía",
        celular: "12345678",
        email: "ana@correo.cl",
        gender: "female",
        university: "santo-tomas",
        birthDate: "2001-03-15",
      },
      unset: {},
    });
  });

  it("un campo vacio se borra y uno ausente no se toca", () => {
    const result = parseStudentDetails({ ciudad: "", region: "   ", gender: "male" }, { now: NOW });

    expect(result).toEqual({
      ok: true,
      set: { gender: "male" },
      unset: { ciudad: 1, region: 1 },
    });
  });

  it("ignora campos que no son editables (no se cuela el rut ni 'enabled')", () => {
    const result = parseStudentDetails({ rut: "1-9", enabled: false, ciudad: "Osorno" }, { now: NOW });

    expect(result).toEqual({ ok: true, set: { ciudad: "Osorno" }, unset: {} });
  });

  it("null y undefined cuentan como ausentes", () => {
    expect(parseStudentDetails({ ciudad: null, region: undefined, gender: "other" }, { now: NOW })).toEqual({
      ok: true,
      set: { gender: "other" },
      unset: {},
    });
  });

  it("acepta cada genero y universidad de la lista", () => {
    for (const gender of GENDERS) {
      expect(parseStudentDetails({ gender }, { now: NOW }).ok).toBe(true);
    }

    for (const university of UNIVERSITIES) {
      expect(parseStudentDetails({ university }, { now: NOW }).ok).toBe(true);
    }
  });

  it("rechaza genero, universidad y tipos que no corresponden", () => {
    expect(parseStudentDetails({ gender: "femenino" }, { now: NOW })).toEqual({
      ok: false,
      message: "El género indicado no es válido.",
    });
    expect(parseStudentDetails({ university: "Otra" }, { now: NOW })).toEqual({
      ok: false,
      message: "La universidad indicada no es válida.",
    });
    expect(parseStudentDetails({ ciudad: 5 }, { now: NOW })).toEqual({
      ok: false,
      message: "La ciudad no es válido.",
    });
    expect(parseStudentDetails({ gender: ["female"] }, { now: NOW }).ok).toBe(false);
  });

  it("valida la fecha de nacimiento: formato, calendario, futuro y rango", () => {
    for (const birthDate of [
      "15-03-2001",
      "2001/03/15",
      "2001-3-5",
      "2001-02-30",
      "2001-13-01",
      "2027-01-01",
      "2026-10-22",
      "1919-12-31",
      "ayer",
    ]) {
      expect(parseStudentDetails({ birthDate }, { now: NOW }), birthDate).toEqual({
        ok: false,
        message: "La fecha de nacimiento no es válida.",
      });
    }

    expect(parseStudentDetails({ birthDate: "2026-10-21" }, { now: NOW }).ok).toBe(true);
    expect(parseStudentDetails({ birthDate: "2000-02-29" }, { now: NOW }).ok).toBe(true);
    expect(parseStudentDetails({ birthDate: "2001-02-29" }, { now: NOW }).ok).toBe(false);
  });

  it("limita el largo de los textos", () => {
    expect(parseStudentDetails({ ciudad: "a".repeat(81) }, { now: NOW }).ok).toBe(false);
    expect(parseStudentDetails({ ciudad: "a".repeat(80) }, { now: NOW }).ok).toBe(true);
    expect(parseStudentDetails({ celular: "1".repeat(21) }, { now: NOW }).ok).toBe(false);
  });

  it("rechaza cuerpos que no son un objeto o que no cambian nada", () => {
    for (const body of [undefined, null, "texto", 5, [], ["ciudad"]]) {
      expect(parseStudentDetails(body, { now: NOW })).toEqual({ ok: false, message: "Datos inválidos." });
    }

    expect(parseStudentDetails({}, { now: NOW })).toEqual({
      ok: false,
      message: "No hay datos para actualizar.",
    });
    expect(parseStudentDetails({ rut: "1-9" }, { now: NOW }).ok).toBe(false);
  });

  it("valida el correo con la misma regla del perfil y permite vaciarlo", () => {
    for (const email of ["ana", "ana@", "@correo.cl", "ana@correo", "a na@correo.cl", `${"a".repeat(120)}@x.cl`]) {
      expect(parseStudentDetails({ email }, { now: NOW }), email).toMatchObject({ ok: false });
    }

    expect(parseStudentDetails({ email: "ana@correo" }, { now: NOW })).toEqual({
      ok: false,
      message: "El correo ingresado no es válido.",
    });
    expect(parseStudentDetails({ email: "ana@uvm.cl" }, { now: NOW })).toMatchObject({
      ok: true,
      set: { email: "ana@uvm.cl" },
    });
    expect(parseStudentDetails({ email: "" }, { now: NOW })).toMatchObject({
      ok: true,
      set: {},
      unset: { email: 1 },
    });
  });

  it("al dar de alta, ningun campo es valido (todos son opcionales)", () => {
    expect(parseStudentDetails({}, { requireChanges: false })).toEqual({ ok: true, set: {}, unset: {} });
    expect(parseStudentDetails({ rut: "1-9", firstName: "Ana" }, { requireChanges: false })).toEqual({
      ok: true,
      set: {},
      unset: {},
    });
    // ... pero lo que si viene se valida igual.
    expect(parseStudentDetails({ gender: "x" }, { requireChanges: false }).ok).toBe(false);
  });
});
