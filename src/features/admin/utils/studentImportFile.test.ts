import { describe, expect, it } from "vitest";

import { cellText, MAX_IMPORT_ROWS, rowsFromSheet } from "./studentImportFile";

const HEADER = ["NOMBRE", "RUT", "FECHA_NACIMIENTO", "EMAIL", "CELULAR", "COMUNA", "REGION", "JORNADA", "GENERO"];

describe("cellText", () => {
  it("una fecha de Excel se lee en UTC: no se corre un día en Chile", () => {
    // Medianoche UTC del 17/05/2001; en hora local de Chile ya es el 16.
    expect(cellText(new Date(Date.UTC(2001, 4, 17)))).toBe("2001-05-17");
  });

  it("números enteros sin decimales, texto recortado y el resto vacío", () => {
    expect(cellText(912345678)).toBe("912345678");
    expect(cellText("  Temuco ")).toBe("Temuco");
    expect(cellText(null)).toBe("");
    expect(cellText(true)).toBe("");
    expect(cellText(new Date("x"))).toBe("");
  });
});

describe("rowsFromSheet", () => {
  it("lee el formato del Excel y numera las filas como en el Excel", () => {
    const result = rowsFromSheet([
      HEADER,
      ["Pérez Soto Juan", "12.345.678-5", new Date(Date.UTC(2001, 4, 17)), "j@uvm.cl", 912345678, "Temuco", "La Araucanía", "Diurna", "Masculino"],
      ["De La Fuente Soto Ana", "11.111.111-1", null, null, null, null, null, null, null],
    ]);

    expect(result.ok && result.rows).toEqual([
      {
        row: 2,
        nombre: "Pérez Soto Juan",
        rut: "12.345.678-5",
        fechaNacimiento: "2001-05-17",
        email: "j@uvm.cl",
        celular: "912345678",
        comuna: "Temuco",
        region: "La Araucanía",
        jornada: "Diurna",
        genero: "Masculino",
      },
      {
        row: 3,
        nombre: "De La Fuente Soto Ana",
        rut: "11.111.111-1",
        fechaNacimiento: "",
        email: "",
        celular: "",
        comuna: "",
        region: "",
        jornada: "",
        genero: "",
      },
    ]);
  });

  it("las columnas pueden venir en otro orden, con otro nombre conocido o faltar; las desconocidas se ignoran", () => {
    const result = rowsFromSheet([
      ["Observaciones", "Run", "Nombre completo", "Fecha de nacimiento", "Región"],
      ["algo", "12.345.678-5", "Pérez Soto Juan", "17/05/2001", "Biobío"],
    ]);

    expect(result.ok && result.rows[0]).toMatchObject({
      row: 2,
      nombre: "Pérez Soto Juan",
      rut: "12.345.678-5",
      fechaNacimiento: "17/05/2001",
      region: "Biobío",
      email: "",
    });
  });

  it("salta las filas totalmente vacías pero conserva la numeración", () => {
    const result = rowsFromSheet([HEADER, [], ["Pérez Soto Juan", "12.345.678-5"], ["", ""], ["Díaz Rojas Ana", "11.111.111-1"]]);

    expect(result.ok && result.rows.map((row) => row.row)).toEqual([3, 5]);
  });

  it.each([
    ["sin datos", [], /vacío/],
    ["sin columna RUT", [["NOMBRE", "EMAIL"], ["a", "b"]], /NOMBRE y RUT/],
    ["solo encabezado", [HEADER], /no tiene estudiantes/],
  ])("rechaza un archivo %s", (_label, data, message) => {
    const result = rowsFromSheet(data as unknown[][]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(message);
  });

  it("rechaza más filas que el máximo por carga", () => {
    const lines = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => [`Pérez Soto Ana ${i}`, `${i}`]);
    const result = rowsFromSheet([HEADER, ...lines]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/máximo por carga/);
  });
});
