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
