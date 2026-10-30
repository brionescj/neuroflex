import { describe, expect, it } from "vitest";

import { GENDERS, STUDY_SHIFTS, UNIVERSITIES, parseStudentDetails } from "./studentFields";

const NOW = new Date("2026-10-21T12:00:00Z");

describe("parseStudentDetails", () => {
  it("guarda los campos con valor, recortados", () => {
    const result = parseStudentDetails(
      {
        comuna: "  Temuco ",
        region: "La Araucanía",
        celular: "12345678",
        email: " Ana@Correo.cl ",
        gender: "female",
        university: "santo-tomas",
        birthDate: "2001-03-15",
      },
      { now: NOW },
    );

    expect(result).toEqual({
      ok: true,
      set: {
        comuna: "Temuco",
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

  it("la region se guarda con su nombre oficial y se rechaza si no existe", () => {
    expect(parseStudentDetails({ region: "region metropolitana" }, { now: NOW })).toEqual({
      ok: true,
      set: { region: "Metropolitana de Santiago" },
      unset: {},
    });
    expect(parseStudentDetails({ region: "La Araucania" }, { now: NOW })).toMatchObject({
      set: { region: "La Araucanía" },
    });
    expect(parseStudentDetails({ region: "Narnia" }, { now: NOW })).toEqual({
      ok: false,
      message: "La región indicada no es válida.",
    });
  });

  it("un campo vacio se borra y uno ausente no se toca", () => {
    const result = parseStudentDetails({ comuna: "", region: "   ", gender: "male" }, { now: NOW });

    expect(result).toEqual({
      ok: true,
      set: { gender: "male" },
      unset: { comuna: 1, region: 1 },
    });
  });

  it("ignora campos que no son editables (no se cuela el rut ni 'enabled')", () => {
    const result = parseStudentDetails(
      { rut: "1-9", enabled: false, region: "Los Lagos", comuna: "Osorno" },
      { now: NOW },
    );

    expect(result).toEqual({ ok: true, set: { region: "Los Lagos", comuna: "Osorno" }, unset: {} });
  });

  it("null y undefined cuentan como ausentes", () => {
    expect(parseStudentDetails({ comuna: null, region: undefined, gender: "other" }, { now: NOW })).toEqual({
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
    expect(parseStudentDetails({ comuna: 5 }, { now: NOW })).toEqual({
      ok: false,
      message: "La comuna no es válido.",
    });
    expect(parseStudentDetails({ gender: ["female"] }, { now: NOW }).ok).toBe(false);
  });

  it("acepta la jornada Diurna o Vespertina, la borra si viene vacia y rechaza otra", () => {
    for (const studyShift of STUDY_SHIFTS) {
      expect(parseStudentDetails({ studyShift }, { now: NOW })).toEqual({
        ok: true,
        set: { studyShift },
        unset: {},
      });
    }

    expect(parseStudentDetails({ studyShift: "" }, { now: NOW })).toEqual({
      ok: true,
      set: {},
      unset: { studyShift: 1 },
    });
    expect(parseStudentDetails({ studyShift: "night" }, { now: NOW })).toEqual({
      ok: false,
      message: "La jornada indicada no es válida.",
    });
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
      "ayer",
    ]) {
      expect(parseStudentDetails({ birthDate }, { now: NOW }), birthDate).toEqual({
        ok: false,
        message: "La fecha de nacimiento no es válida.",
      });
    }

    expect(parseStudentDetails({ birthDate: "2000-02-29" }, { now: NOW }).ok).toBe(true);
    expect(parseStudentDetails({ birthDate: "2001-02-29" }, { now: NOW }).ok).toBe(false);
  });

  it("la edad debe estar entre 17 y 80 anos cumplidos", () => {
    const age = { ok: false, message: "La edad del estudiante debe estar entre 17 y 80 años." };

    // NOW es el 21 de octubre de 2026.
    expect(parseStudentDetails({ birthDate: "2009-10-21" }, { now: NOW }).ok).toBe(true); // cumple 17 hoy
    expect(parseStudentDetails({ birthDate: "2009-10-22" }, { now: NOW })).toEqual(age); // 16, cumple mañana
    expect(parseStudentDetails({ birthDate: "2026-10-21" }, { now: NOW })).toEqual(age); // recien nacido
    expect(parseStudentDetails({ birthDate: "1945-10-22" }, { now: NOW }).ok).toBe(true); // 80, cumple 81 mañana
    expect(parseStudentDetails({ birthDate: "1945-10-21" }, { now: NOW })).toEqual(age); // cumple 81 hoy
    expect(parseStudentDetails({ birthDate: "1919-12-31" }, { now: NOW })).toEqual(age);
  });

  it("limita el largo de los textos", () => {
    expect(parseStudentDetails({ comuna: "a".repeat(81), region: "Los Lagos" }, { now: NOW })).toEqual({
      ok: false,
      message: "La comuna es demasiado largo.",
    });
    expect(parseStudentDetails({ celular: "1".repeat(21) }, { now: NOW }).ok).toBe(false);
  });

  it("rechaza cuerpos que no son un objeto o que no cambian nada", () => {
    for (const body of [undefined, null, "texto", 5, [], ["comuna"]]) {
      expect(parseStudentDetails(body, { now: NOW })).toEqual({ ok: false, message: "Datos inválidos." });
    }

    expect(parseStudentDetails({}, { now: NOW })).toEqual({
      ok: false,
      message: "No hay datos para actualizar.",
    });
    expect(parseStudentDetails({ rut: "1-9" }, { now: NOW }).ok).toBe(false);
  });

  it("el correo se guarda en minusculas aunque se escriba con mayusculas", () => {
    expect(parseStudentDetails({ email: "  Ana.Perez@UVM.CL " }, { now: NOW })).toEqual({
      ok: true,
      set: { email: "ana.perez@uvm.cl" },
      unset: {},
    });
  });

  it("valida el correo y explica que falta (@, punto del dominio, tildes...)", () => {
    const problem = (email: string) => parseStudentDetails({ email }, { now: NOW });

    expect(problem("ana")).toEqual({ ok: false, message: "Falta el @ en el correo." });
    expect(problem("ana@")).toEqual({ ok: false, message: "Falta el dominio después del @." });
    expect(problem("ana@correo")).toEqual({
      ok: false,
      message: "Falta el punto del dominio después del @ (por ejemplo, .cl o .com).",
    });
    expect(problem("josé@uvm.cl")).toMatchObject({ ok: false });
    expect(problem("Muñoz@UVM.cl")).toMatchObject({ ok: true, set: { email: "muñoz@uvm.cl" } });
    expect(problem(`${"a".repeat(120)}@x.cl`)).toEqual({ ok: false, message: "El correo es demasiado largo." });
    expect(problem("ana@uvm.cl")).toMatchObject({ ok: true, set: { email: "ana@uvm.cl" } });
  });

  it("un correo vacio se borra de la ficha", () => {
    expect(parseStudentDetails({ email: "" }, { now: NOW })).toMatchObject({
      ok: true,
      set: {},
      unset: { email: 1 },
    });
  });

  it("al dar de alta, ningun campo es valido (todos son opcionales)", () => {
    expect(parseStudentDetails({}, { requireChanges: false })).toEqual({ ok: true, set: {}, unset: {} });
    // El RUT no es un dato editable de la ficha: se ignora.
    expect(parseStudentDetails({ rut: "1-9" }, { requireChanges: false })).toEqual({ ok: true, set: {}, unset: {} });
    // ... pero lo que si viene se valida igual.
    expect(parseStudentDetails({ gender: "x" }, { requireChanges: false }).ok).toBe(false);
  });
});

describe("parseStudentDetails: nombres y apellidos", () => {
  it("se corrigen con la inicial de cada palabra en mayuscula, sin espacios de mas", () => {
    expect(
      parseStudentDetails({ firstName: "  camiLo   andres ", paternalLastName: "BRIONES", maternalLastName: "vergara" }),
    ).toEqual({
      ok: true,
      set: { firstName: "Camilo Andres", paternalLastName: "Briones", maternalLastName: "Vergara" },
      unset: {},
    });
  });

  it("solo cambia el que viene; los demas no se tocan", () => {
    expect(parseStudentDetails({ paternalLastName: "soto" })).toEqual({
      ok: true,
      set: { paternalLastName: "Soto" },
      unset: {},
    });
  });

  it("nunca pueden quedar vacios ni llevar numeros o simbolos", () => {
    for (const body of [
      { firstName: "" },
      { firstName: "   " },
      { paternalLastName: "P3rez" },
      { maternalLastName: "Soto#" },
      { firstName: 5 },
      { firstName: "a".repeat(61) },
    ]) {
      expect(parseStudentDetails(body).ok, JSON.stringify(body)).toBe(false);
    }
  });
});


describe("comuna y región", () => {
  const araucania = { region: "La Araucanía", comuna: "Temuco" };

  it("la comuna se guarda con su nombre oficial y tiene que ser de la región", () => {
    expect(parseStudentDetails({ region: "araucania", comuna: "PADRE LAS CASAS" }, { now: NOW })).toEqual({
      ok: true,
      set: { region: "La Araucanía", comuna: "Padre Las Casas" },
      unset: {},
    });
    expect(parseStudentDetails({ region: "La Araucanía", comuna: "Concepción" }, { now: NOW })).toEqual({
      ok: false,
      message: "La comuna indicada no pertenece a la región elegida.",
    });
    expect(parseStudentDetails({ region: "La Araucanía", comuna: "Narnia" }, { now: NOW }).ok).toBe(false);
  });

  it("sin región elegida no hay comuna que elegir", () => {
    expect(parseStudentDetails({ comuna: "Temuco" }, { now: NOW })).toEqual({
      ok: false,
      message: "Elige primero la región para poder elegir la comuna.",
    });
    expect(parseStudentDetails({ region: "", comuna: "Temuco" }, { now: NOW, current: araucania }).ok).toBe(false);
  });

  it("una comuna sola se compara con la región que la ficha ya tiene", () => {
    expect(parseStudentDetails({ comuna: "Villarrica" }, { now: NOW, current: araucania })).toEqual({
      ok: true,
      set: { comuna: "Villarrica" },
      unset: {},
    });
    expect(parseStudentDetails({ comuna: "Valdivia" }, { now: NOW, current: araucania }).ok).toBe(false);
  });

  it("cambiar de región borra la comuna que ya no le pertenece; si sigue siendo de ella, se conserva", () => {
    expect(parseStudentDetails({ region: "Biobío" }, { now: NOW, current: araucania })).toEqual({
      ok: true,
      set: { region: "Biobío" },
      unset: { comuna: 1 },
    });
    expect(parseStudentDetails({ region: "Biobío", comuna: "Lota" }, { now: NOW, current: araucania })).toEqual({
      ok: true,
      set: { region: "Biobío", comuna: "Lota" },
      unset: {},
    });
    // Quitar la región también quita la comuna.
    expect(parseStudentDetails({ region: "" }, { now: NOW, current: araucania })).toEqual({
      ok: true,
      set: {},
      unset: { region: 1, comuna: 1 },
    });
  });

  it("reenviar la misma región no borra la comuna, aunque la región se haya escrito distinto", () => {
    expect(parseStudentDetails({ region: "la araucania" }, { now: NOW, current: araucania })).toEqual({
      ok: true,
      set: { region: "La Araucanía" },
      unset: {},
    });
  });

  it("una comuna antigua que no es de ninguna lista se conserva si no se toca", () => {
    expect(parseStudentDetails({ gender: "male" }, { now: NOW, current: { region: "Biobío", comuna: "Concepcion Centro" } })).toEqual({
      ok: true,
      set: { gender: "male" },
      unset: {},
    });
  });
});
