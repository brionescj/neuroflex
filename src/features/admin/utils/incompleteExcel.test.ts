import { describe, expect, it } from "vitest";

import type { Student } from "@/types";

import { unzipSync, strFromU8 } from "fflate";

import { INCOMPLETE_COLUMNS, incompleteExcelBlob, incompleteFileName, incompleteSheetRows } from "./incompleteExcel";
import { missingProfileFields } from "./incompleteProfile";

const student: Student = {
  rut: "12345678-5",
  firstName: "Ana",
  paternalLastName: "Soto",
  maternalLastName: "Pérez",
  paralelo: 2,
  entryYear: 2026,
  studyShift: "evening",
  university: "uvm",
  enabled: true,
  registered: false,
  celular: "12345678",
  region: "Biobío",
  avatarId: "cat",
  isDeleted: false,
};

describe("incompleteSheetRows", () => {
  const [row] = incompleteSheetRows([{ student, missing: missingProfileFields(student) }]);
  const cell = (column: (typeof INCOMPLETE_COLUMNS)[number]) => row?.[INCOMPLETE_COLUMNS.indexOf(column)];

  it("una celda por columna", () => {
    expect(row).toHaveLength(INCOMPLETE_COLUMNS.length);
  });

  it("los datos que faltan dicen «Falta» y van en rojo", () => {
    for (const column of ["Correo", "Fecha de nacimiento", "Comuna", "Género"] as const) {
      expect(cell(column)).toMatchObject({ value: "Falta", textColor: "#9C0006", backgroundColor: "#FFC7CE" });
    }
  });

  it("los datos que están se muestran como en el panel y sin color", () => {
    expect(cell("Nombre")).toEqual({ value: "Ana Soto Pérez" });
    expect(cell("Universidad")).toEqual({ value: "UVM" });
    expect(cell("Paralelo")).toEqual({ value: 2 });
    expect(cell("Celular")).toEqual({ value: "+569 12345678" });
    expect(cell("Jornada")).toEqual({ value: "Vespertina" });
    expect(cell("Región")).toEqual({ value: "Biobío" });
  });

  it("junta lo que falta, el estado de contacto y si ya se registró (si no, «No» en rojo)", () => {
    expect(cell("Datos que faltan")).toMatchObject({
      value: "Registrarse en la plataforma, Correo, Fecha de nacimiento, Comuna, Género",
    });
    expect(cell("Contacto")).toEqual({ value: "Falta contactar" });
    expect(cell("Registrado")).toMatchObject({ value: "No", textColor: "#9C0006", backgroundColor: "#FFC7CE" });

    const [contacted] = incompleteSheetRows([{ student: { ...student, contacted: true, registered: true }, missing: [] }]);

    expect(contacted?.[INCOMPLETE_COLUMNS.indexOf("Contacto")]).toEqual({ value: "Contactado" });
    expect(contacted?.[INCOMPLETE_COLUMNS.indexOf("Registrado")]).toEqual({ value: "Sí" });
  });
});

describe("incompleteExcelBlob: la columna «Contacto»", () => {
  it("cada celda es una lista con «Falta contactar» y «Contactado», y se pinta según lo elegido", async () => {
    const entries = [student, { ...student, rut: "1-9" }, { ...student, rut: "2-7", contacted: true }].map((item) => ({
      student: item,
      missing: missingProfileFields(item),
    }));
    const blob = await incompleteExcelBlob(entries);
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"] as Uint8Array);
    const styles = strFromU8(files["xl/styles.xml"] as Uint8Array);

    // Columna M (la 13), de la fila 2 a la 4: una por estudiante.
    expect(sheet).toMatch(/<dataValidation [^>]*sqref="M2:M4"/);
    expect(sheet).toContain("Falta contactar,Contactado");
    expect(sheet).toMatch(/<conditionalFormatting sqref="M2:M4"/);
    expect(styles).toContain("C6EFCE");
    expect(styles).toContain("FFEB9C");
  });
});

describe("incompleteFileName", () => {
  it("lleva el día", () => {
    expect(incompleteFileName(new Date(2026, 9, 30))).toBe("neuroflex-datos-incompletos-2026-10-30.xlsx");
  });
});
