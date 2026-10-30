import { describe, expect, it } from "vitest";

import { normalizeImportedDate, parseImportRow, splitFullName, type ImportRowInput } from "./studentImport";

const NOW = new Date("2026-10-30T12:00:00Z");

const row = (extra: Partial<ImportRowInput> = {}): ImportRowInput => ({
  row: 2,
  nombre: "Pérez Soto Juan",
  rut: "12.345.678-5",
  fechaNacimiento: "",
  email: "",
  celular: "",
  comuna: "",
  region: "",
  jornada: "",
  genero: "",
  ...extra,
});

function split(full: string) {
  const result = splitFullName(full);

  if (!result.ok) throw new Error(result.message);

  return result.value;
}

describe("splitFullName: Apellido_Paterno Apellido_Materno Nombres", () => {
  it("separa 1, 2 y 3 nombres", () => {
    expect(split("Pérez Soto Juan")).toEqual({ paternalLastName: "Pérez", maternalLastName: "Soto", firstName: "Juan" });
    expect(split("PEREZ SOTO JUAN CARLOS")).toEqual({ paternalLastName: "Pérez".replace("é", "e"), maternalLastName: "Soto", firstName: "Juan Carlos" });
    expect(split("perez soto juan carlos andres").firstName).toBe("Juan Carlos Andres");
  });

  it("un apellido compuesto con «de», «de la», «del», «de los»… es UN solo apellido", () => {
    expect(split("De La Fuente Soto María José")).toEqual({
      paternalLastName: "De La Fuente",
      maternalLastName: "Soto",
      firstName: "María José",
    });
    expect(split("del Rio Pérez Ana")).toMatchObject({ paternalLastName: "Del Rio", maternalLastName: "Pérez", firstName: "Ana" });
    expect(split("Soto de los Ríos Pedro")).toMatchObject({ paternalLastName: "Soto", maternalLastName: "De Los Ríos", firstName: "Pedro" });
    expect(split("Vergara San Martín Luis")).toMatchObject({ paternalLastName: "Vergara", maternalLastName: "San Martín", firstName: "Luis" });
  });

  it("los dos apellidos pueden ser compuestos a la vez", () => {
    expect(split("De la Cruz Del Río Camila Fernanda")).toEqual({
      paternalLastName: "De La Cruz",
      maternalLastName: "Del Río",
      firstName: "Camila Fernanda",
    });
  });

  it("un nombre con partícula («María de los Ángeles») sigue siendo del nombre", () => {
    expect(split("Pérez Soto María de los Ángeles")).toMatchObject({
      paternalLastName: "Pérez",
      maternalLastName: "Soto",
      firstName: "María De Los Ángeles",
    });
  });

  it("normaliza espacios y mayúsculas", () => {
    expect(split("  perez   SOTO  juan ")).toEqual({ paternalLastName: "Perez", maternalLastName: "Soto", firstName: "Juan" });
  });

  it.each([
    ["vacío", "   ", /Falta el nombre/],
    ["solo dos palabras", "Pérez Juan", /apellido paterno, apellido materno y al menos un nombre/],
    ["sin nombre tras dos apellidos compuestos", "De La Fuente Del Río", /al menos un nombre/],
    ["termina en partícula", "Pérez Soto de la", /falta la palabra/],
    ["más de 3 nombres", "Pérez Soto Ana Luisa María Paz", /más de 3/],
    ["números", "Pérez Soto Juan2", /solo puede tener letras/],
  ])("no separa: %s", (_label, text, message) => {
    const result = splitFullName(text);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(message);
  });
});

describe("normalizeImportedDate", () => {
  it.each([
    ["2001-05-17", "2001-05-17"],
    ["17/05/2001", "2001-05-17"],
    ["7-5-2001", "2001-05-07"],
    ["07.05.2001", "2001-05-07"],
    // 36663 = 17 de mayo de 2000 en el calendario de Excel.
    ["36663", "2000-05-17"],
    ["36663.0", "2000-05-17"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeImportedDate(raw)).toBe(expected);
  });

  it("rechaza lo que no se entiende, incluido el año de dos cifras", () => {
    expect(normalizeImportedDate("17/05/01")).toBeNull();
    expect(normalizeImportedDate("mayo 2001")).toBeNull();
    expect(normalizeImportedDate("")).toBeNull();
  });
});

describe("parseImportRow", () => {
  it("con solo RUT y nombre carga la ficha y deja el resto sin rellenar", () => {
    const parsed = parseImportRow(row(), NOW);

    expect(parsed).toEqual({
      ok: true,
      rut: "12345678-5",
      name: "Juan Pérez Soto",
      set: { firstName: "Juan", paternalLastName: "Pérez", maternalLastName: "Soto" },
      warnings: [],
    });
  });

  it("interpreta todos los campos del formato del Excel", () => {
    const parsed = parseImportRow(
      row({
        fechaNacimiento: "17/05/2001",
        email: " Juan.Perez@UVM.cl ",
        celular: "+56 9 1234 5678",
        region: "Región del Biobío",
        comuna: "concepcion",
        jornada: "Vespertina",
        genero: "Femenino",
      }),
      NOW,
    );

    expect(parsed.ok && parsed.set).toEqual({
      firstName: "Juan",
      paternalLastName: "Pérez",
      maternalLastName: "Soto",
      birthDate: "2001-05-17",
      email: "juan.perez@uvm.cl",
      celular: "+56 9 1234 5678",
      region: "Biobío",
      comuna: "Concepción",
      studyShift: "evening",
      gender: "female",
    });
    expect(parsed.ok && parsed.warnings).toEqual([]);
  });

  it("acepta las formas cortas de jornada y género", () => {
    const parsed = parseImportRow(row({ jornada: "D", genero: "M" }), NOW);

    expect(parsed.ok && parsed.set).toMatchObject({ studyShift: "day", gender: "male" });
  });

  it("sin región, la comuna la deduce si es única; con una región que no la tiene, no la rellena", () => {
    const inferred = parseImportRow(row({ comuna: "Padre Las Casas" }), NOW);

    expect(inferred.ok && inferred.set).toMatchObject({ region: "La Araucanía", comuna: "Padre Las Casas" });

    const mismatch = parseImportRow(row({ region: "Biobío", comuna: "Temuco" }), NOW);

    expect(mismatch.ok && mismatch.set.comuna).toBeUndefined();
    expect(mismatch.ok && mismatch.set.region).toBe("Biobío");
    expect(mismatch.ok && mismatch.warnings.join(" ")).toMatch(/Temuco.*no pertenece a la región Biobío/);
  });

  it("reconoce la región aunque venga abreviada y valida la comuna contra ella", () => {
    const parsed = parseImportRow(row({ region: "Libertador Gral. B. O'Higgins", comuna: "Rancagua" }), NOW);

    expect(parsed.ok && parsed.set).toMatchObject({
      region: "Libertador General Bernardo O'Higgins",
      comuna: "Rancagua",
    });
    expect(parsed.ok && parsed.warnings).toEqual([]);
  });

  it("una comuna de Ñuble escrita con Biobío (la región de antes de 2018) queda en Ñuble, sin aviso", () => {
    for (const region of ["Biobío", "Bio Bio", "VIII Región"]) {
      const parsed = parseImportRow(row({ region, comuna: "COELEMU" }), NOW);

      expect(parsed.ok && parsed.set).toMatchObject({ region: "Ñuble", comuna: "Coelemu" });
      expect(parsed.ok && parsed.warnings).toEqual([]);
    }
  });

  it("si la comuna es de otra región, no se adivina: el aviso dice de cuál es", () => {
    const parsed = parseImportRow(row({ region: "Biobío", comuna: "Temuco" }), NOW);

    expect(parsed.ok && parsed.set.comuna).toBeUndefined();
    expect(parsed.ok && parsed.warnings).toEqual(["Comuna: «Temuco» no pertenece a la región Biobío (es de La Araucanía)."]);
  });

  it("un dato opcional que no se entiende queda sin rellenar y se avisa, sin perder la fila", () => {
    const parsed = parseImportRow(
      row({
        email: "sin-arroba",
        fechaNacimiento: "ayer",
        jornada: "mañana",
        genero: "x",
        region: "Mordor",
        comuna: "Hobbiton",
        celular: "1".repeat(30),
      }),
      NOW,
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(Object.keys(parsed.set).sort()).toEqual(["firstName", "maternalLastName", "paternalLastName"]);
    expect(parsed.warnings).toHaveLength(7);
  });

  it("la edad fuera de 17 a 80 años deja la fecha sin rellenar con el aviso de siempre", () => {
    const parsed = parseImportRow(row({ fechaNacimiento: "01/01/2015" }), NOW);

    expect(parsed.ok && parsed.set.birthDate).toBeUndefined();
    expect(parsed.ok && parsed.warnings[0]).toMatch(/entre 17 y 80 años/);
  });

  it("sin RUT, con RUT inválido o con nombre que no se separa, la fila no se carga", () => {
    expect(parseImportRow(row({ rut: "" }), NOW)).toEqual({ ok: false, message: "Falta el RUT." });
    expect(parseImportRow(row({ rut: "12.345.678-9" }), NOW)).toMatchObject({ ok: false, message: "El RUT no es válido." });
    expect(parseImportRow(row({ nombre: "Pérez Juan" }), NOW)).toMatchObject({ ok: false, rut: "12345678-5" });
  });
});
