/**
 * Nombres y apellidos: la inicial de cada palabra en mayuscula y el resto en
 * minuscula ("Camilo Andres Briones Vergara"). Es la misma regla que aplica el
 * servidor (lib/personName.ts; el navegador no comparte codigo con el servidor):
 * lib/personNameParity.test.ts comprueba que coincidan.
 */

/** Una letra que abre una palabra: al inicio o tras un espacio, guion o apostrofe. */
const WORD_START = /(^|[\s'’-])(\p{L})/gu;

/** Inicial de cada palabra en mayuscula y el resto en minuscula; conserva los espacios (sirve mientras se escribe). */
export function toNameCase(value: string): string {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("es")
    .replace(WORD_START, (_match, before: string, letter: string) => `${before}${letter.toLocaleUpperCase("es")}`);
}

/** Como se guarda un nombre: sin espacios de mas y con la inicial de cada palabra en mayuscula. */
export function normalizePersonName(value: string): string {
  return toNameCase(value.trim().replace(/\s+/g, " "));
}
