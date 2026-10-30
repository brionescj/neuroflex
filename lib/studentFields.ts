import { normalizeCommune } from "./communes";
import { emailProblem, normalizeEmail } from "./email";
import { parseNameChanges, type NameField } from "./personName";
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

/** Jornada de estudio: Diurna o Vespertina. */
export const STUDY_SHIFTS = ["day", "evening"] as const;

/** Los cinco paralelos de la cohorte (1 a 5). */
export const PARALELOS = [1, 2, 3, 4, 5] as const;

export function isParalelo(value: unknown): value is (typeof PARALELOS)[number] {
  return (PARALELOS as readonly unknown[]).includes(value);
}

const FIELDS = [
  "comuna",
  "region",
  "celular",
  "email",
  "gender",
  "university",
  "studyShift",
  "birthDate",
] as const;

type Field = (typeof FIELDS)[number];

const LABELS: Record<Field, string> = {
  comuna: "La comuna",
  region: "La región",
  celular: "El celular",
  email: "El correo",
  gender: "El género",
  university: "La universidad",
  studyShift: "La jornada",
  birthDate: "La fecha de nacimiento",
};

const MAX_LENGTH: Partial<Record<Field, number>> = {
  comuna: 80,
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
  set: Partial<Record<Field | NameField, string>>;
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

  if (field === "studyShift" && !(STUDY_SHIFTS as readonly string[]).includes(value)) {
    return "La jornada indicada no es válida.";
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
  /**
   * La region y la comuna que la ficha ya tiene. La comuna debe pertenecer a la region: sin esto, una comuna
   * enviada sola (o una region nueva) no se puede comprobar contra lo que ya esta guardado.
   */
  current?: { region?: string | null; comuna?: string | null };
};

/**
 * La comuna siempre es de la region de la ficha: se escribe con su nombre oficial y exige que la region este
 * elegida. Si la region cambia y la comuna guardada ya no pertenece a la nueva, esa comuna se borra (no puede
 * quedar una comuna de otra region). Modifica `set` y `unset`; devuelve el problema, si lo hay.
 */
function reconcilePlace(
  set: StudentDetailsChanges["set"],
  unset: StudentDetailsChanges["unset"],
  current: ParseOptions["current"],
): string | null {
  const region = set.region ?? (unset.region ? undefined : (normalizeRegion(current?.region ?? "") ?? undefined));

  if (set.comuna !== undefined) {
    if (!region) return "Elige primero la región para poder elegir la comuna.";

    const official = normalizeCommune(region, set.comuna);

    if (!official) return "La comuna indicada no pertenece a la región elegida.";

    set.comuna = official;

    return null;
  }

  const regionChanged =
    (set.region !== undefined && set.region !== normalizeRegion(current?.region ?? "")) || unset.region !== undefined;

  if (regionChanged && !unset.comuna && current?.comuna && !(region && normalizeCommune(region, current.comuna))) {
    unset.comuna = 1;
  }

  return null;
}

/**
 * Interpreta los datos opcionales de una ficha, al crearla o editarla. Un campo
 * ausente no se toca, uno vacio se borra y uno con texto se valida y se guarda.
 */
export function parseStudentDetails(
  body: unknown,
  { now = new Date(), requireChanges = true, current }: ParseOptions = {},
): ParsedStudentDetails {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Datos inválidos." };
  }

  const input = body as Record<string, unknown>;
  const set: StudentDetailsChanges["set"] = {};
  const unset: StudentDetailsChanges["unset"] = {};

  const names = parseNameChanges(input);

  if (!names.ok) return names;

  Object.assign(set, names.set);

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

  const placeProblem = reconcilePlace(set, unset, current);

  if (placeProblem) return { ok: false, message: placeProblem };

  if (
    requireChanges &&
    Object.keys(set).length === 0 &&
    Object.keys(unset).length === 0
  ) {
    return { ok: false, message: "No hay datos para actualizar." };
  }

  return { ok: true, set, unset };
}
