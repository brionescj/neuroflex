import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import type { StudentImportRowResult } from "@/types";

import {
  IMPORT_WARNING_COLUMNS,
  importWarningRows,
  importWarningsExcelBlob,
  importWarningsFileName,
  splitWarning,
} from "./importWarningsExcel";

const results: StudentImportRowResult[] = [
  { row: 22, status: "ready", rut: "11111111-1", name: "Ana Soto Pérez", warnings: ["Correo: Falta el @ en el correo."] },
  { row: 3, status: "ready", rut: "22222222-2", name: "Luis Rojas Díaz", warnings: [] },
  {
    row: 5,
    status: "ready",
    rut: "33333333-3",
    name: "Eva Mora Pino",
    warnings: ["Región: «Narnia» no es una región de Chile.", "Género: «x» no se reconoce."],
  },
];

const context = { university: "UVM", paralelo: 2 };

describe("splitWarning", () => {
  it("separa el dato del motivo", () => {
    expect(splitWarning("Correo: Falta el @ en el correo.")).toEqual({ field: "Correo", reason: "Falta el @ en el correo." });
  });

  it("sin dato, todo es motivo", () => {
    expect(splitWarning("algo raro")).toEqual({ field: "", reason: "algo raro" });
  });
});

describe("importWarningRows", () => {
  const rows = importWarningRows(results, context);

  it("una fila por dato que falta, en el orden del archivo, y sin los estudiantes sin avisos", () => {
    expect(rows.map((row) => row[0]?.value)).toEqual([5, 5, 22]);
    expect(rows.every((row) => row.length === IMPORT_WARNING_COLUMNS.length)).toBe(true);
  });

  it("trae nombre, RUT, universidad, paralelo, dato y motivo (en rojo)", () => {
    expect(rows[2]).toEqual([
      { value: 22 },
      { value: "Ana Soto Pérez" },
      { value: "11111111-1" },
      { value: "UVM" },
      { value: 2 },
      { value: "Correo" },
      { value: "Falta el @ en el correo.", textColor: "#9C0006", backgroundColor: "#FFC7CE" },
    ]);
  });

  it("sin avisos no hay filas", () => {
    expect(importWarningRows([], context)).toEqual([]);
  });
});

describe("importWarningsFileName", () => {
  it("lleva la fecha", () => {
    expect(importWarningsFileName(new Date(2026, 9, 5))).toBe("neuroflex-carga-masiva-datos-sin-rellenar-2026-10-05.xlsx");
  });
});

describe("importWarningsExcelBlob", () => {
  it("es un .xlsx con el encabezado y los motivos", async () => {
    const files = unzipSync(new Uint8Array(await (await importWarningsExcelBlob(results, context)).arrayBuffer()));
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"] as Uint8Array);
    const strings = strFromU8(files["xl/sharedStrings.xml"] as Uint8Array);

    expect(strings).toContain("Falta el @ en el correo.");
    expect(strings).toContain("Motivo");
    expect(sheet).toContain("<sheetData>");
  });
});
