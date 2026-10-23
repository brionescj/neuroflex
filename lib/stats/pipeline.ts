import {
  FILTER_DIMENSIONS,
  NO_DATA_KEY,
  NO_DATA_LABEL,
  OTHERS_KEY,
  OTHERS_LABEL,
  ageOf,
  compareValues,
  dimensionValue,
  dimensionValueLabel,
  deviceOfAttempt,
  fixedValues,
} from "./dimensions";
import type {
  AgeRange,
  AttemptRow,
  ChartRequest,
  DimensionId,
  Filters,
  Partida,
  StudentRow,
} from "./types";

/** Tope de series en un grafico: pasado esto, los grupos chicos se juntan en "Otros". */
export const MAX_COLORED_GROUPS = 7;

/** Menos estudiantes que esto en un grupo: se avisa que no se debe concluir. */
export const LOW_N = 5;

/** Una partida sin actividad por mas de esto se considera abandonada. */
export const ABANDON_AFTER_MS = 4 * 60 * 60 * 1000;

export type GroupSpec = { key: string; label: string; slot: number };

export type Grouped<T> = {
  specs: GroupSpec[];
  byGroup: Map<string, T[]>;
};

export function indexStudents(students: StudentRow[]): Map<string, StudentRow> {
  return new Map(students.map((student) => [student.rut, student]));
}

export function studentName(student: StudentRow | undefined, rut: string): string {
  if (!student) return rut;

  return `${student.firstName.split(" ")[0] ?? ""} ${student.paternalLastName}`.trim();
}

/**
 * Si un valor pasa los filtros. Dentro de una caracteristica los valores
 * elegidos son alternativas (o); entre caracteristicas se exigen todas (y).
 */
export function passesFilters(
  filters: Filters,
  valueOf: (dimension: DimensionId) => string | null,
): boolean {
  for (const dimension of FILTER_DIMENSIONS) {
    const wanted = filters[dimension];

    if (!wanted || wanted.length === 0) continue;

    if (!wanted.includes(valueOf(dimension) ?? NO_DATA_KEY)) return false;
  }

  return true;
}

/** Si una edad esta dentro del rango pedido. Sin edad conocida no se puede afirmar: queda fuera. */
export function passesAge(range: AgeRange | null, age: number | null): boolean {
  if (range === null) return true;
  if (age === null) return false;
  if (range.min !== null && age < range.min) return false;
  if (range.max !== null && age > range.max) return false;

  return true;
}

/** Si una partida cumple todos los filtros del pedido, incluida la edad. */
export function attemptPasses(
  request: Pick<ChartRequest, "filters" | "ageRange">,
  attempt: AttemptRow,
  students: Map<string, StudentRow>,
): boolean {
  return (
    passesFilters(request.filters, attemptValueOf(attempt, students)) &&
    passesAge(
      request.ageRange,
      ageOf(students.get(attempt.studentRut), attempt.student, attempt.startedAt),
    )
  );
}

/** Valor de una caracteristica para una partida, segun su foto y la ficha. */
export function attemptValueOf(
  attempt: AttemptRow,
  students: Map<string, StudentRow>,
): (dimension: DimensionId) => string | null {
  const student = students.get(attempt.studentRut);

  return (dimension) =>
    dimension === "device"
      ? deviceOfAttempt(attempt)
      : dimensionValue(dimension, student, attempt.student, attempt.startedAt);
}

/**
 * Una partida por estudiante: la primera, la ultima o todas. Se aplica despues
 * de filtrar, de modo que "primera" es la primera de las que quedaron.
 */
export function pickPartida(
  attempts: AttemptRow[],
  partida: Partida,
): AttemptRow[] {
  if (partida === "all") return attempts;

  const chosen = new Map<string, AttemptRow>();

  for (const attempt of attempts) {
    const current = chosen.get(attempt.studentRut);

    const better =
      !current ||
      (partida === "first"
        ? attempt.attemptNumber < current.attemptNumber
        : attempt.attemptNumber > current.attemptNumber);

    if (better) chosen.set(attempt.studentRut, attempt);
  }

  return attempts.filter((attempt) => chosen.get(attempt.studentRut) === attempt);
}

export type GroupItem<T> = {
  item: T;
  rut: string;
  valueOf: (dimension: DimensionId) => string | null;
};

/**
 * Reparte elementos (partidas o estudiantes) en los grupos que se comparan.
 * Cada grupo conserva siempre su color; con mas de 7 grupos los chicos se
 * juntan en "Otros".
 */
export function groupItems<T>(
  items: GroupItem<T>[],
  request: Pick<ChartRequest, "groupBy" | "students">,
  students: Map<string, StudentRow>,
): Grouped<T> {
  const { groupBy } = request;

  if (groupBy === "none") {
    return {
      specs: [{ key: "all", label: "Todos los estudiantes", slot: 0 }],
      byGroup: new Map([["all", items.map((entry) => entry.item)]]),
    };
  }

  if (groupBy === "student") {
    const byGroup = new Map<string, T[]>();

    request.students.forEach((rut) => {
      byGroup.set(
        rut,
        items.filter((entry) => entry.rut === rut).map((entry) => entry.item),
      );
    });

    const names = request.students.map((rut) => studentName(students.get(rut), rut));

    return {
      specs: request.students.map((rut, position) => ({
        key: rut,
        // Dos estudiantes con el mismo nombre se distinguen por su RUT.
        label:
          names.filter((name) => name === names[position]).length > 1
            ? `${names[position]} (${rut})`
            : (names[position] as string),
        slot: position % 8,
      })),
      byGroup,
    };
  }

  const dimension = groupBy;
  const members = new Map<string, Set<string>>();
  const valueByItem = new Map<T, string>();

  for (const entry of items) {
    const value = entry.valueOf(dimension) ?? NO_DATA_KEY;

    valueByItem.set(entry.item, value);

    const set = members.get(value) ?? new Set<string>();

    set.add(entry.rut);
    members.set(value, set);
  }

  const regular = [...members.keys()]
    .filter((value) => value !== NO_DATA_KEY)
    .sort((a, b) => compareValues(dimension, a, b));

  let shown = regular;

  if (regular.length > MAX_COLORED_GROUPS) {
    // Se quedan los grupos con mas estudiantes; el resto va a "Otros".
    const biggest = [...regular]
      .sort(
        (a, b) =>
          (members.get(b)?.size ?? 0) - (members.get(a)?.size ?? 0) ||
          compareValues(dimension, a, b),
      )
      .slice(0, MAX_COLORED_GROUPS);

    shown = regular.filter((value) => biggest.includes(value));
  }

  const hasOthers = shown.length < regular.length;
  const hasNoData = members.has(NO_DATA_KEY);
  const fixed = fixedValues(dimension);

  const specs: GroupSpec[] = shown.map((value, position) => ({
    key: value,
    label: dimensionValueLabel(dimension, value),
    // Los valores fijos conservan su color aunque se filtre alguno.
    slot: fixed ? Math.max(fixed.indexOf(value), 0) : position,
  }));

  if (hasOthers) specs.push({ key: OTHERS_KEY, label: OTHERS_LABEL, slot: -1 });
  if (hasNoData) specs.push({ key: NO_DATA_KEY, label: NO_DATA_LABEL, slot: -2 });

  const byGroup = new Map<string, T[]>(specs.map((spec) => [spec.key, []]));

  for (const entry of items) {
    const value = valueByItem.get(entry.item) as string;
    const key =
      value === NO_DATA_KEY || shown.includes(value) ? value : OTHERS_KEY;

    byGroup.get(key)?.push(entry.item);
  }

  return { specs, byGroup };
}
