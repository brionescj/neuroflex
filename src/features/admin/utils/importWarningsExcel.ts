import { saveBlob } from "@/features/stats/utils/download";
import type { StudentImportRowResult } from "@/types";

/** Datos de la carga que acompanan a cada fila del registro. */
export type ImportWarningsContext = { university: string; paralelo: number };

/** Un dato que no se pudo cargar: letras rojas sobre fondo rosado, como en el Excel de datos incompletos. */
const REASON_STYLE = { textColor: "#9C0006", backgroundColor: "#FFC7CE" };

type Cell = { value: string | number; textColor?: string; backgroundColor?: string; fontWeight?: "bold" } | null;

export const IMPORT_WARNING_COLUMNS = ["Fila del archivo", "Nombre", "RUT", "Universidad", "Paralelo", "Dato", "Motivo"] as const;

const WIDTHS = [16, 36, 14, 16, 10, 22, 70];

/** «Región: «X» no es una región de Chile.» -> el dato («Región») y el motivo (««X» no es una región de Chile.»). */
export function splitWarning(warning: string): { field: string; reason: string } {
  const at = warning.indexOf(": ");

  return at === -1 ? { field: "", reason: warning } : { field: warning.slice(0, at), reason: warning.slice(at + 2) };
}

/**
 * Las filas de la hoja: una por cada dato que no se pudo cargar (un estudiante con dos datos malos ocupa dos filas, para
 * poder filtrar por dato). Van en el orden del archivo.
 */
export function importWarningRows(results: StudentImportRowResult[], context: ImportWarningsContext): Cell[][] {
  return [...results]
    .sort((a, b) => a.row - b.row)
    .flatMap((result) =>
      result.warnings.map((warning): Cell[] => {
        const { field, reason } = splitWarning(warning);

        return [
          { value: result.row },
          { value: result.name ?? "" },
          { value: result.rut ?? "" },
          { value: context.university },
          { value: context.paralelo },
          { value: field },
          { value: reason, ...REASON_STYLE },
        ];
      }),
    );
}

const two = (n: number) => String(n).padStart(2, "0");

/** «neuroflex-carga-masiva-datos-sin-rellenar-2026-10-30.xlsx» (el dia del reloj de quien descarga). */
export function importWarningsFileName(now: Date = new Date()): string {
  return `neuroflex-carga-masiva-datos-sin-rellenar-${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}.xlsx`;
}

/** El archivo .xlsx del registro, sin descargarlo. */
export async function importWarningsExcelBlob(
  results: StudentImportRowResult[],
  context: ImportWarningsContext,
): Promise<Blob> {
  const { default: writeXlsxFile } = await import("write-excel-file/universal");
  const header = IMPORT_WARNING_COLUMNS.map((value) => ({ value, fontWeight: "bold" as const }));

  return writeXlsxFile([header, ...importWarningRows(results, context)], {
    sheet: "Datos sin rellenar",
    columns: WIDTHS.map((width) => ({ width })),
    stickyRowsCount: 1,
  }).toBlob();
}

/** Descarga el registro de los estudiantes que se cargan con datos sin rellenar y el porque de cada uno. */
export async function downloadImportWarningsExcel(
  results: StudentImportRowResult[],
  context: ImportWarningsContext,
): Promise<void> {
  saveBlob(await importWarningsExcelBlob(results, context), importWarningsFileName());
}
