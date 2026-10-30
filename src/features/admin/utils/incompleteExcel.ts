import { genderLabel, studyShiftLabel, universityLabel } from "@/config/studentOptions";
import { saveBlob } from "@/features/stats/utils/download";
import type { Student } from "@/types";

import { formatBirthDate } from "./birthDate";
import { CONTACT_OPTIONS, contactLabel, type MissingField } from "./incompleteProfile";

export type IncompleteEntry = { student: Student; missing: MissingField[] };

/** Un dato que falta: letras rojas sobre fondo rosado, para verlo de un vistazo al recorrer la hoja. */
const MISSING_STYLE = { textColor: "#9C0006", backgroundColor: "#FFC7CE", fontWeight: "bold" as const };

type Cell = { value: string | number; textColor?: string; backgroundColor?: string; fontWeight?: "bold" } | null;

export const INCOMPLETE_COLUMNS = [
  "Nombre",
  "RUT",
  "Universidad",
  "Paralelo",
  "Celular",
  "Correo",
  "Fecha de nacimiento",
  "Jornada",
  "Región",
  "Comuna",
  "Género",
  "Datos que faltan",
  "Contacto",
  "Registrado",
] as const;

const WIDTHS = [34, 14, 16, 10, 16, 30, 20, 12, 22, 22, 16, 44, 16, 12];

/**
 * Las filas de la hoja: una por estudiante. Cada dato que falta se escribe «Falta» en rojo; los que estan, tal cual
 * se ven en el panel. «Datos que faltan» los junta en una sola celda para filtrar o leer al telefono.
 */
export function incompleteSheetRows(entries: IncompleteEntry[]): Cell[][] {
  return entries.map(({ student, missing }) => {
    const lacks = new Set(missing.map((field) => field.key));
    const value = (key: MissingField["key"], text: string | undefined): Cell =>
      lacks.has(key) || !text ? { value: "Falta", ...MISSING_STYLE } : { value: text };

    return [
      { value: `${student.firstName} ${student.paternalLastName} ${student.maternalLastName}` },
      { value: student.rut },
      value("university", universityLabel(student.university)),
      { value: student.paralelo },
      value("celular", student.celular ? `+569 ${student.celular}` : undefined),
      value("email", student.email),
      value("birthDate", formatBirthDate(student.birthDate)),
      value("studyShift", studyShiftLabel(student.studyShift)),
      value("region", student.region),
      value("comuna", student.comuna),
      value("gender", genderLabel(student.gender)),
      { value: missing.map((field) => field.label).join(", "), ...MISSING_STYLE },
      { value: contactLabel(student.contacted === true) },
      lacks.has("registered") ? { value: "No", ...MISSING_STYLE } : { value: "Sí" },
    ];
  });
}

const two = (n: number) => String(n).padStart(2, "0");

/** «neuroflex-datos-incompletos-2026-10-30.xlsx» (el dia del reloj de quien descarga). */
export function incompleteFileName(now: Date = new Date()): string {
  return `neuroflex-datos-incompletos-${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}.xlsx`;
}

/** Columna (desde 1, como pide Excel) donde va el estado de contacto. */
export const CONTACT_COLUMN = INCOMPLETE_COLUMNS.indexOf("Contacto") + 1;

/**
 * La celda de «Contacto» de cada fila es una lista con las dos alternativas, para cambiarla en el propio Excel, y se
 * pinta sola segun lo elegido (ambar = falta contactar, verde = contactado).
 */
export function contactColumnOptions(rowCount: number) {
  const cellRange = { from: { row: 2, column: CONTACT_COLUMN }, to: { row: rowCount + 1, column: CONTACT_COLUMN } };

  return {
    dataValidation: [
      {
        cellRange,
        validation: {
          type: "list" as const,
          values: CONTACT_OPTIONS.map((option) => option.label),
          error: "Elige «Falta contactar» o «Contactado».",
        },
      },
    ],
    conditionalFormatting: [
      {
        cellRange,
        condition: { operator: "=" as const, value: contactLabel(true) },
        style: { textColor: "#006100", backgroundColor: "#C6EFCE" },
      },
      {
        cellRange,
        condition: { operator: "=" as const, value: contactLabel(false) },
        style: { textColor: "#7F6000", backgroundColor: "#FFEB9C" },
      },
    ],
  };
}

/** El archivo .xlsx de la lista, sin descargarlo. */
export async function incompleteExcelBlob(entries: IncompleteEntry[]): Promise<Blob> {
  const [{ default: writeXlsxFile }, { default: dataValidation }] = await Promise.all([
    import("write-excel-file/universal"),
    import("@onparallel/write-excel-file-data-validation"),
  ]);
  const header = INCOMPLETE_COLUMNS.map((value) => ({ value, fontWeight: "bold" as const }));

  return writeXlsxFile(
    [header, ...incompleteSheetRows(entries)],
    {
      sheet: "Datos incompletos",
      columns: WIDTHS.map((width) => ({ width })),
      stickyRowsCount: 1,
      ...(entries.length > 0 && contactColumnOptions(entries.length)),
    },
    { features: [dataValidation] },
  ).toBlob();
}

/** Descarga la hoja con los estudiantes que se estan viendo (con la busqueda y el filtro de contacto aplicados). */
export async function downloadIncompleteExcel(entries: IncompleteEntry[]): Promise<void> {
  saveBlob(await incompleteExcelBlob(entries), incompleteFileName());
}
