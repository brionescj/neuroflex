/**
 * Nombres y apellidos de las personas. Se guardan con la inicial de cada palabra
 * en mayuscula y el resto en minuscula ("Camilo Andres Briones Vergara"), sin
 * importar como se hayan escrito. Es la misma regla que src/utils/personName.ts
 * (el navegador no comparte codigo con el servidor): personNameParity.test.ts
 * comprueba que coincidan.
 */
export const MAX_NAME_LENGTH = 60;

/** Letras (con tildes y ñ), espacios, guion y apostrofe; debe partir con una letra. */
const VALID_NAME = /^\p{L}[\p{L}\s'’-]*$/u;

/** Una letra que abre una palabra: al inicio o tras un espacio, guion o apostrofe. */
const WORD_START = /(^|[\s'’-])(\p{L})/gu;

/**
 * Inicial de cada palabra en mayuscula y el resto en minuscula. Conserva los
 * espacios tal como vienen (sirve mientras se escribe).
 */
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

export type ParsedPersonName = { ok: true; value: string } | { ok: false; message: string };

/** Valida y normaliza un nombre o apellido. `label` abre el mensaje de error ("El apellido paterno"). */
export function parsePersonName(label: string, raw: unknown): ParsedPersonName {
  if (typeof raw !== "string") return { ok: false, message: `${label} no es válido.` };

  const value = normalizePersonName(raw);

  if (value === "") return { ok: false, message: `${label} no puede quedar vacío.` };
  if (value.length > MAX_NAME_LENGTH) return { ok: false, message: `${label} es demasiado largo.` };
  if (!VALID_NAME.test(value)) return { ok: false, message: `${label} solo puede tener letras.` };

  return { ok: true, value };
}

/** Nombres y apellidos: el admin puede corregirlos (un cambio legal de nombre, por ejemplo), nunca dejarlos vacios. */
export const NAME_FIELDS = ["firstName", "paternalLastName", "maternalLastName"] as const;

export type NameField = (typeof NAME_FIELDS)[number];

export const NAME_LABELS: Record<NameField, string> = {
  firstName: "Los nombres",
  paternalLastName: "El apellido paterno",
  maternalLastName: "El apellido materno",
};

export type ParsedNameChanges =
  | { ok: true; set: Partial<Record<NameField, string>> }
  | { ok: false; message: string };

/** Los nombres y apellidos que traiga un cuerpo, ya validados y normalizados; los ausentes no se tocan. */
export function parseNameChanges(input: Record<string, unknown>): ParsedNameChanges {
  const set: Partial<Record<NameField, string>> = {};

  for (const field of NAME_FIELDS) {
    const raw = input[field];

    if (raw === undefined || raw === null) continue;

    const name = parsePersonName(NAME_LABELS[field], raw);

    if (!name.ok) return name;

    set[field] = name.value;
  }

  return { ok: true, set };
}
