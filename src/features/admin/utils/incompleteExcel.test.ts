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
    expect(cell("Contacto")).toMatchObject({ value: "Falta contactar", backgroundColor: "#FFEB9C" });
    expect(cell("Registrado")).toMatchObject({ value: "No", textColor: "#9C0006", backgroundColor: "#FFC7CE" });

    const [contacted] = incompleteSheetRows([{ student: { ...student, contacted: true, registered: true }, missing: [] }]);

    // Parte en ambar igual que las demas: la regla condicional es la que la pone en verde.
    expect(contacted?.[INCOMPLETE_COLUMNS.indexOf("Contacto")]).toMatchObject({ value: "Contactado", backgroundColor: "#FFEB9C" });
    expect(contacted?.[INCOMPLETE_COLUMNS.indexOf("Registrado")]).toEqual({ value: "Sí" });
  });
});

/** Orden de los hijos de <worksheet> segun el esquema de Office Open XML: Excel declara danado un archivo que lo rompa. */
const WORKSHEET_ORDER = [
  "sheetPr", "dimension", "sheetViews", "sheetFormatPr", "cols", "sheetData", "sheetCalcPr", "sheetProtection",
  "protectedRanges", "scenarios", "autoFilter", "sortState", "dataConsolidate", "customSheetViews", "mergeCells",
  "phoneticPr", "conditionalFormatting", "dataValidations", "hyperlinks", "printOptions", "pageMargins", "pageSetup",
  "headerFooter", "rowBreaks", "colBreaks", "customProperties", "cellWatches", "ignoredErrors", "smartTags", "drawing",
  "legacyDrawing", "legacyDrawingHF", "picture", "oleObjects", "controls", "webPublishItems", "tableParts", "extLst",
];

/** Los nombres de los hijos directos de <worksheet>, en el orden en que aparecen. */
function topLevelTags(xml: string): string[] {
  const body = xml.slice(xml.indexOf(">", xml.indexOf("<worksheet")) + 1, xml.lastIndexOf("</worksheet>"));
  const tags: string[] = [];
  let depth = 0;

  for (const match of body.matchAll(/<(\/?)([A-Za-z0-9:]+)[^>]*?(\/?)>/g)) {
    const [, closing, name, selfClosing] = match;

    if (closing) {
      depth -= 1;
    } else {
      if (depth === 0) tags.push(name as string);
      if (!selfClosing) depth += 1;
    }
  }

  return tags;
}

describe("incompleteExcelBlob: la columna «Contacto»", () => {
  const entries = [student, { ...student, rut: "1-9" }, { ...student, rut: "2-7", contacted: true }].map((item) => ({
    student: item,
    missing: missingProfileFields(item),
  }));

  async function sheetXml(list = entries) {
    const files = unzipSync(new Uint8Array(await (await incompleteExcelBlob(list)).arrayBuffer()));

    return { sheet: strFromU8(files["xl/worksheets/sheet1.xml"] as Uint8Array), styles: strFromU8(files["xl/styles.xml"] as Uint8Array) };
  }

  it("cada celda es una lista con «Falta contactar» y «Contactado», y «Contactado» se pinta de verde", async () => {
    const { sheet, styles } = await sheetXml();

    // Columna M (la 13), de la fila 2 a la 4: una por estudiante.
    expect(sheet).toMatch(/<dataValidation [^>]*sqref="M2:M4"/);
    expect(sheet).toContain("Falta contactar,Contactado");
    expect(sheet).toMatch(/<conditionalFormatting sqref="M2:M4"/);
    expect(styles).toContain("C6EFCE");
  });

  it("los elementos de la hoja van en el orden del esquema (si no, Excel dice que el archivo está dañado)", async () => {
    for (const list of [entries, entries.slice(0, 1)]) {
      const tags = topLevelTags((await sheetXml(list)).sheet);
      const positions = tags.map((tag) => WORKSHEET_ORDER.indexOf(tag));

      expect(positions.every((position) => position >= 0), tags.join(",")).toBe(true);
      expect(positions, tags.join(",")).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  it("hay una sola regla condicional: con dos, el complemento de listas deja <dataValidations> entre ellas", async () => {
    const { sheet } = await sheetXml();

    expect(sheet.match(/<conditionalFormatting /g)).toHaveLength(1);
    expect(sheet.match(/<dataValidations /g)).toHaveLength(1);
  });

  it("sin estudiantes no hay listas ni reglas", async () => {
    const { sheet } = await sheetXml([]);

    expect(sheet).not.toContain("dataValidation");
    expect(sheet).not.toContain("conditionalFormatting");
  });
});

describe("incompleteFileName", () => {
  it("lleva el día", () => {
    expect(incompleteFileName(new Date(2026, 9, 30))).toBe("neuroflex-datos-incompletos-2026-10-30.xlsx");
  });
});
