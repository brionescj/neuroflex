import type { StudentImportRow, StudentImportRowResult } from "@/types";

/** El aviso es de la region o de la comuna: lo unico que se puede corregir a mano desde la revision. */
export function isPlaceWarning(warning: string): boolean {
  return warning.startsWith("Región:") || warning.startsWith("Comuna:");
}

/** La fila tiene una region o comuna que no se pudo asociar. */
export function hasPlaceWarning(result: StudentImportRowResult): boolean {
  return result.warnings.some(isPlaceWarning);
}

/**
 * Las filas con la region y la comuna de una de ellas reemplazadas por las que eligio el administrador (nombres
 * oficiales de las listas, o "" para dejarlas sin rellenar). El resto de la fila y las demas filas quedan igual.
 */
export function applyPlaceFix(
  rows: readonly StudentImportRow[],
  rowNumber: number,
  place: { region: string; comuna: string },
): StudentImportRow[] {
  return rows.map((row) => (row.row === rowNumber ? { ...row, region: place.region, comuna: place.comuna } : row));
}
