import { emailProblem, normalizeEmail } from "./email";
import { normalizeRegion } from "./region";

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

/**
 * Edad permitida al ingresar un estudiante (anos cumplidos hoy). Copia de
 * src/config/studentOptions.ts: studentOptionsParity.test.ts comprueba que
 * coincidan. Tambien son los limites del filtro de edad de las estadisticas.
 */
export const MIN_STUDENT_AGE = 17;
export const MAX_STUDENT_AGE = 80;

export const AGE_PROBLEM = `La edad del estudiante debe estar entre ${MIN_STUDENT_AGE} y ${MAX_STUDENT_AGE} años.`;

export type StudentDetailsChanges = {
  /** Campos con valor nuevo. */
  set: Partial<Record<Field, string>>;
  /** Campos que el admin vacio: se quitan de la ficha. */
  unset: Partial<Record<Field, 1>>;
};

export type ParsedStudentDetails =
  | ({ ok: true } & StudentDetailsChanges)
  | { ok: false; message: string };

/** Anos cumplidos en la fecha `now` (UTC). */
function wholeYears(year: number, month: number, day: number, now: Date): number {
  const monthNow = now.getUTCMonth() + 1;
  const birthdayPassed =
    monthNow > month || (monthNow === month && now.getUTCDate() >= day);

  return now.getUTCFullYear() - year - (birthdayPassed ? 0 : 1);
}

/** "invalid": no es una fecha real o es futura; "age": real pero fuera de 17 a 80 anos. */
function birthDateStatus(value: string, now: Date): "ok" | "invalid" | "age" {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return "invalid";

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date "corrige" fechas imposibles (31 de febrero): se comprueba que no lo hizo.
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  if (!isRealDate || date.getTime() > today) return "invalid";

  const age = wholeYears(year, month, day, now);

  return age >= MIN_STUDENT_AGE && age <= MAX_STUDENT_AGE ? "ok" : "age";
}

function invalidReason(field: Field, value: string, now: Date): string | null {
  const max = MAX_LENGTH[field];

  if (max !== undefined && value.length > max) {
    return `${LABELS[field]} es demasiado largo.`;
  }

  if (field === "email") return emailProblem(value);

  if (field === "region" && normalizeRegion(value) === null) {
    return "La región indicada no es válida.";
  }

  if (field === "gender" && !(GENDERS as readonly string[]).includes(value)) {
    return "El género indicado no es válido.";
  }

  if (field === "university" && !(UNIVERSITIES as readonly string[]).includes(value)) {
    return "La universidad indicada no es válida.";
  }

  if (field === "birthDate") {
    const status = birthDateStatus(value, now);

    if (status === "invalid") return "La fecha de nacimiento no es válida.";
    if (status === "age") return AGE_PROBLEM;
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

    // El correo se guarda siempre en minusculas, como se haya escrito.
    const value = field === "email" ? normalizeEmail(raw) : raw.trim();

    if (value === "") {
      unset[field] = 1;
      continue;
    }

    const reason = invalidReason(field, value, now);

    if (reason) return { ok: false, message: reason };

    // La region se guarda con su nombre oficial aunque se haya escrito distinto.
    set[field] = field === "region" ? (normalizeRegion(value) as string) : value;
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
