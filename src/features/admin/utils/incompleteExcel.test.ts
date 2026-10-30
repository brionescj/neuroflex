import { describe, expect, it } from "vitest";

import type { Student } from "@/types";

import { INCOMPLETE_COLUMNS, incompleteFileName, incompleteSheetRows } from "./incompleteExcel";
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

  it("junta lo que falta, el estado de contacto y si ya se registró", () => {
    expect(cell("Datos que faltan")).toMatchObject({ value: "Correo, Fecha de nacimiento, Comuna, Género" });
    expect(cell("Contacto")).toEqual({ value: "Falta contactar" });
    expect(cell("Registrado")).toEqual({ value: "No" });

    const [contacted] = incompleteSheetRows([{ student: { ...student, contacted: true }, missing: [] }]);

    expect(contacted?.[INCOMPLETE_COLUMNS.indexOf("Contacto")]).toEqual({ value: "Contactado" });
  });
});

describe("incompleteFileName", () => {
  it("lleva el día", () => {
    expect(incompleteFileName(new Date(2026, 9, 30))).toBe("neuroflex-datos-incompletos-2026-10-30.xlsx");
  });
});
