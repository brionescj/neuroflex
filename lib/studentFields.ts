import { isValidEmail } from "./email";

/**
 * Datos del estudiante que el admin puede cargar al darlo de alta o corregir
 * desde su ficha. Los valores de GENDERS y UNIVERSITIES se guardan tal cual en
 * la base y en el snapshot de cada partida (con ellos se agrupan las
 * estadisticas). Copia de src/config/studentOptions.ts:
 * studentOptionsParity.test.ts comprueba que coincidan, porque el servidor no
 * comparte codigo con el navegador.
 */
export const GENDERS = ["female", "male", "other", "undisclosed"] as const;

export const UNIVERSITIES = ["santo-tomas", "uvm"] as const;

const FIELDS = [
  "ciudad",
  "region",
  "celular",
  "email",
  "gender",
  "university",
  "birthDate",
] as const;

type Field = (typeof FIELDS)[number];

const LABELS: Record<Field, string> = {
  ciudad: "La ciudad",
  region: "La región",
  celular: "El celular",
  email: "El correo",
  gender: "El género",
  university: "La universidad",
  birthDate: "La fecha de nacimiento",
};

const MAX_LENGTH: Partial<Record<Field, number>> = {
  ciudad: 80,
  region: 80,
  celular: 20,
  email: 120,
};

const MIN_BIRTH_YEAR = 1920;

export type StudentDetailsChanges = {
  /** Campos con valor nuevo. */
  set: Partial<Record<Field, string>>;
  /** Campos que el admin vacio: se quitan de la ficha. */
  unset: Partial<Record<Field, 1>>;
};

export type ParsedStudentDetails =
  | ({ ok: true } & StudentDetailsChanges)
  | { ok: false; message: string };

function isValidBirthDate(value: string, now: Date): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return false;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date "corrige" fechas imposibles (31 de febrero): se comprueba que no lo hizo.
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return isRealDate && year >= MIN_BIRTH_YEAR && date.getTime() <= today;
}

function invalidReason(field: Field, value: string, now: Date): string | null {
  const max = MAX_LENGTH[field];

  if (max !== undefined && value.length > max) {
    return `${LABELS[field]} es demasiado largo.`;
  }

  if (field === "email" && !isValidEmail(value)) {
    return "El correo ingresado no es válido.";
  }

  if (field === "gender" && !(GENDERS as readonly string[]).includes(value)) {
    return "El género indicado no es válido.";
  }

  if (field === "university" && !(UNIVERSITIES as readonly string[]).includes(value)) {
    return "La universidad indicada no es válida.";
  }

  if (field === "birthDate" && !isValidBirthDate(value, now)) {
    return "La fecha de nacimiento no es válida.";
  }

  return null;
}

export type ParseOptions = {
  /** Fecha de referencia para validar la de nacimiento (por defecto, hoy). */
  now?: Date;
  /**
   * Con true (lo normal al editar) un cuerpo sin ningun campo es un error. Al
   * dar de alta un estudiante estos datos son opcionales y puede no venir ninguno.
   */
  requireChanges?: boolean;
};

/**
 * Interpreta los datos opcionales de una ficha, al crearla o editarla. Un campo
 * ausente no se toca, uno vacio se borra y uno con texto se valida y se guarda.
 */
export function parseStudentDetails(
  body: unknown,
  { now = new Date(), requireChanges = true }: ParseOptions = {},
): ParsedStudentDetails {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Datos inválidos." };
  }

  const input = body as Record<string, unknown>;
  const set: StudentDetailsChanges["set"] = {};
  const unset: StudentDetailsChanges["unset"] = {};

  for (const field of FIELDS) {
    const raw = input[field];

    if (raw === undefined || raw === null) continue;

    if (typeof raw !== "string") {
      return { ok: false, message: `${LABELS[field]} no es válido.` };
    }

    const value = raw.trim();

    if (value === "") {
      unset[field] = 1;
      continue;
    }

    const reason = invalidReason(field, value, now);

    if (reason) return { ok: false, message: reason };

    set[field] = value;
  }

  if (
    requireChanges &&
    Object.keys(set).length === 0 &&
    Object.keys(unset).length === 0
  ) {
    return { ok: false, message: "No hay datos para actualizar." };
  }

  return { ok: true, set, unset };
}
