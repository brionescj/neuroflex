import { MAX_STUDENT_AGE, MIN_STUDENT_AGE } from "@/config/studentOptions";

const ISO = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
const LATIN = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;

function parts(value: string | undefined): [string, string, string] | null {
  const text = value?.trim() ?? "";
  const iso = ISO.exec(text);

  if (iso) return [iso[1] as string, iso[2] as string, iso[3] as string];

  const latin = LATIN.exec(text);

  if (latin) return [latin[3] as string, latin[2] as string, latin[1] as string];

  return null;
}

const two = (n: string) => n.padStart(2, "0");

/**
 * Fecha para un <input type="date"> (AAAA-MM-DD). Las fichas antiguas pueden
 * traer DD-MM-AAAA; lo que no se entiende queda vacio.
 */
export function toInputDate(value: string | undefined): string {
  const found = parts(value);

  return found ? `${found[0]}-${two(found[1])}-${two(found[2])}` : "";
}

/** Fecha para mostrar (DD-MM-AAAA); si no se entiende, se muestra tal cual. */
export function formatBirthDate(value: string | undefined): string | undefined {
  const found = parts(value);

  if (found) return `${two(found[2])}-${two(found[1])}-${found[0]}`;

  return value?.trim() || undefined;
}

const pad = (n: number) => String(n).padStart(2, "0");

function inputDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

/**
 * Fechas de nacimiento que el formulario deja elegir: quien tiene entre 17 y
 * 80 anos cumplidos hoy. El servidor vuelve a comprobarlo.
 */
export function birthDateRange(now: Date = new Date()): { min: string; max: string } {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // Un 29 de febrero no existe en el ano de hace 17 u 81 anos: se usa el 28.
  const safeDay = (y: number) => (month === 2 && day === 29 && new Date(y, 1, 29).getMonth() !== 1 ? 28 : day);

  // Cumple 17 hoy o antes; y todavia no cumple 81 (nacio despues de hace 81 anos).
  const max = inputDate(year - MIN_STUDENT_AGE, month, safeDay(year - MIN_STUDENT_AGE));
  const oldest = new Date(year - (MAX_STUDENT_AGE + 1), month - 1, safeDay(year - (MAX_STUDENT_AGE + 1)) + 1);

  return {
    min: inputDate(oldest.getFullYear(), oldest.getMonth() + 1, oldest.getDate()),
    max,
  };
}
