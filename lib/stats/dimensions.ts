import { ageAt } from "../gameAttempts";
import { MAX_STUDENT_AGE, PARALELOS } from "../studentFields";
import { REGIONS, normalizeRegion } from "../region";
import type {
  AttemptRow,
  DimensionId,
  OptionChoice,
  StudentRow,
} from "./types";

/**
 * Caracteristicas por las que se filtra y se compara. El valor de cada una sale
 * de la foto que se guardo en la partida (lo que valia cuando jugo) y, si ahi
 * faltaba, de la ficha actual del estudiante.
 */
export const DIMENSION_IDS: readonly DimensionId[] = [
  "paralelo",
  "university",
  "gender",
  "ageBand",
  "region",
  "ciudad",
  "studyShift",
  "entryYear",
  "device",
];

/**
 * Por cuales se puede filtrar: por todas. La edad se puede filtrar de dos
 * maneras que se combinan: un rango exacto (AgeRange) o los tramos de 5 anos
 * (`ageBand`), que son los mismos grupos que se usan para comparar.
 */
export const FILTER_DIMENSIONS: readonly DimensionId[] = DIMENSION_IDS;

export const DIMENSION_LABELS: Record<DimensionId, string> = {
  paralelo: "Paralelo",
  university: "Universidad",
  gender: "Género",
  ageBand: "Tramo de edad",
  region: "Región",
  ciudad: "Ciudad",
  studyShift: "Jornada",
  entryYear: "Año de ingreso",
  device: "Dispositivo",
};

/** Clave del grupo "no hay dato de esta caracteristica". */
export const NO_DATA_KEY = "none";
export const NO_DATA_LABEL = "Sin dato";

/** Clave del grupo que junta los grupos chicos cuando hay mas de 8. */
export const OTHERS_KEY = "others";
export const OTHERS_LABEL = "Otros";

/**
 * Tramos de edad: 17 a 20 y despues de 5 en 5 (21 a 25, 26 a 30...) hasta el
 * limite de edad de las fichas.
 */
const AGE_BANDS: string[] = ["17-20"];

for (let from = 21; from <= MAX_STUDENT_AGE; from += 5) {
  AGE_BANDS.push(`${from}-${Math.min(from + 4, MAX_STUDENT_AGE)}`);
}

const FIXED: Partial<Record<DimensionId, OptionChoice[]>> = {
  paralelo: PARALELOS.map((n) => ({ value: String(n), label: `Paralelo ${n}` })),
  university: [
    { value: "santo-tomas", label: "Santo Tomás" },
    { value: "uvm", label: "UVM" },
  ],
  gender: [
    { value: "female", label: "Femenino" },
    { value: "male", label: "Masculino" },
    { value: "other", label: "Otro" },
    { value: "undisclosed", label: "No informa" },
  ],
  ageBand: AGE_BANDS.map((band) => ({ value: band, label: `${band.replace("-", " a ")} años` })),
  studyShift: [
    { value: "day", label: "Diurna" },
    { value: "evening", label: "Vespertina" },
  ],
  device: [
    { value: "mobile", label: "Celular" },
    { value: "tablet", label: "Tableta" },
    { value: "desktop", label: "Computador" },
  ],
};

/** Lado corto de pantalla desde el que un aparato tactil se considera tableta y no celular. */
export const TABLET_MIN_SHORT_SIDE = 600;

/** Ancho desde el que un equipo con mouse y pantalla tactil se considera computador. */
const LAPTOP_MIN_WIDTH = 1024;

export type DeviceInfo = {
  pointer?: string;
  viewportWidth?: number;
  viewportHeight?: number;
} | null | undefined;

/**
 * Tipo de aparato en que se jugo, estimado con lo que el navegador informo: el
 * puntero (tactil, mouse o ambos) y el tamano de la ventana. No es el modelo
 * real: una tableta con teclado y mouse, o un celular con la ventana muy ancha,
 * puede caer en otra categoria. Sin datos del aparato, null.
 */
export function deviceClassOf(device: DeviceInfo): "mobile" | "tablet" | "desktop" | null {
  if (!device) return null;

  const { pointer, viewportWidth: width, viewportHeight: height } = device;

  if (pointer === "mouse") return "desktop";
  if (pointer !== "touch" && pointer !== "mixed") return null;
  if (typeof width !== "number" || typeof height !== "number") return null;

  const shortSide = Math.min(width, height);

  if (shortSide < TABLET_MIN_SHORT_SIDE) return "mobile";
  // Pantalla tactil y mouse a la vez: un notebook tactil, salvo que sea chico.
  if (pointer === "mixed" && width >= LAPTOP_MIN_WIDTH) return "desktop";

  return "tablet";
}

/** Dispositivo de una partida: el de su primera sesion. */
export function deviceOfAttempt(attempt: Pick<AttemptRow, "sessions">): string | null {
  return deviceClassOf(attempt.sessions?.[0]?.device);
}

/** Tramo de edad ("17-20", "21-25", "26-30"...). Fuera del rango de las fichas queda en el tramo de la punta. */
export function ageBandOf(age: number | null | undefined): string | null {
  if (typeof age !== "number" || !Number.isFinite(age)) return null;

  const whole = Math.floor(age);

  if (whole <= 20) return AGE_BANDS[0] as string;

  const index = Math.min(Math.floor((whole - 21) / 5) + 1, AGE_BANDS.length - 1);

  return AGE_BANDS[index] as string;
}

const SMALL_WORDS = new Set(["de", "del", "la", "las", "los", "el", "y", "e"]);

/** "valparaiso" y "VALPARAISO" son la misma ciudad: se agrupan con mayuscula inicial. */
export function titleCase(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function whole(value: unknown): string | null {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : null;
}

/**
 * El valor de una caracteristica para un estudiante en un momento. `snapshot`
 * es la foto de la partida (puede faltar, p. ej. al contar participacion).
 */
export function dimensionValue(
  dimension: DimensionId,
  student: StudentRow | undefined,
  snapshot: AttemptRow["student"],
  at: Date,
): string | null {
  const snap = snapshot ?? {};

  switch (dimension) {
    case "paralelo":
      return whole(snap.paralelo) ?? whole(student?.paralelo);
    case "entryYear":
      return whole(snap.entryYear) ?? whole(student?.entryYear);
    case "university":
      return text(snap.university) ?? text(student?.university);
    case "gender":
      return text(snap.gender) ?? text(student?.gender);
    case "region": {
      const raw = text(snap.region) ?? text(student?.region);

      // Las fichas antiguas traen la region escrita a mano: se lleva a su nombre oficial.
      return raw === null ? null : (normalizeRegion(raw) ?? raw);
    }
    case "ciudad": {
      const raw = text(snap.ciudad) ?? text(student?.ciudad);

      return raw === null ? null : titleCase(raw);
    }
    case "studyShift":
      return text(snap.studyShift) ?? text(student?.studyShift);
    case "ageBand":
      return ageBandOf(ageOf(student, snapshot, at));
    case "device":
      // Es de la partida, no de la ficha: lo resuelve attemptValueOf.
      return null;
  }
}

/** Edad en anos al momento dado: la de la foto de la partida o, si falta, la de la fecha de nacimiento. */
export function ageOf(
  student: StudentRow | undefined,
  snapshot: AttemptRow["student"],
  at: Date,
): number | null {
  return typeof snapshot?.ageAtStart === "number"
    ? snapshot.ageAtStart
    : ageAt(student?.birthDate, at);
}

export function dimensionValueLabel(dimension: DimensionId, value: string): string {
  if (value === NO_DATA_KEY) return NO_DATA_LABEL;

  const fixed = FIXED[dimension]?.find((choice) => choice.value === value);

  if (fixed) return fixed.label;

  return value;
}

/** Valores posibles en orden natural (los fijos), o null si dependen de los datos. */
export function fixedValues(dimension: DimensionId): string[] | null {
  return FIXED[dimension]?.map((choice) => choice.value) ?? null;
}

/** Orden de los grupos de una caracteristica: el natural, "Sin dato" al final. */
export function compareValues(
  dimension: DimensionId,
  a: string,
  b: string,
): number {
  if (a === b) return 0;
  if (a === NO_DATA_KEY) return 1;
  if (b === NO_DATA_KEY) return -1;

  const fixed = fixedValues(dimension);

  if (fixed) return fixed.indexOf(a) - fixed.indexOf(b);

  if (dimension === "entryYear") return Number(a) - Number(b);

  if (dimension === "region") {
    const order = (value: string) => {
      const at = (REGIONS as readonly string[]).indexOf(value);

      return at === -1 ? REGIONS.length : at;
    };

    return order(a) - order(b) || a.localeCompare(b, "es");
  }

  return a.localeCompare(b, "es");
}

/**
 * Tramos de edad que hay entre los estudiantes. Como la edad de una partida es
 * la que tenia al jugar (puede ser menor que la de hoy), se ofrece tambien el
 * tramo que tenian un ano atras: asi no se pierde el grupo de quien cumplio
 * anos desde entonces.
 */
function presentAgeBands(students: StudentRow[], now: Date): string[] {
  const found = new Set<string>();
  const yearAgo = new Date(now);

  yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);

  for (const student of students) {
    for (const at of [now, yearAgo]) {
      const band = ageBandOf(ageAt(student.birthDate, at));

      if (band !== null) found.add(band);
    }
  }

  return AGE_BANDS.filter((band) => found.has(band));
}

/** Valores de la ficha que de verdad hay, sin repetir, con su orden natural. */
function presentValues(
  dimension: DimensionId,
  students: StudentRow[],
  now: Date,
): string[] {
  const found = new Set<string>();

  for (const student of students) {
    const value = dimensionValue(dimension, student, null, now);

    if (value !== null) found.add(value);
  }

  return [...found].sort((a, b) => compareValues(dimension, a, b));
}

/**
 * Opciones de cada filtro. Genero, universidad y jornada ofrecen siempre todos
 * sus valores. Paralelo, region, ciudad y ano de ingreso ofrecen solo los que
 * hay en las fichas (asi no se filtra por algo que no existe); el ano en curso
 * se agrega siempre, de modo que al llegar enero aparece solo el ano nuevo.
 * No hay opcion "Sin dato": sin marcar nada, el filtro no excluye a nadie.
 */
export function filterOptions(
  students: StudentRow[],
  now: Date,
  currentYear: number,
): Partial<Record<DimensionId, OptionChoice[]>> {
  const result: Partial<Record<DimensionId, OptionChoice[]>> = {};

  for (const dimension of FILTER_DIMENSIONS) {
    let values: string[];

    if (dimension === "entryYear") {
      values = [...new Set([...presentValues(dimension, students, now), String(currentYear)])].sort(
        (a, b) => Number(a) - Number(b),
      );
    } else if (dimension === "ageBand") {
      values = presentAgeBands(students, now);
    } else if (FIXED[dimension] && dimension !== "paralelo") {
      values = fixedValues(dimension) as string[];
    } else {
      values = presentValues(dimension, students, now);
    }

    result[dimension] = values.map((value) => ({
      value,
      label: dimensionValueLabel(dimension, value),
    }));
  }

  return result;
}
