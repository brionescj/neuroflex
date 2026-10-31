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
} from "./dimensions.js";
import { formatDateRange } from "./time.js";
import type {
  AgeRange,
  AttemptRow,
  ChartRequest,
  DimensionId,
  Filters,
  Partida,
  StudentRow,
  Take,
} from "./types.js";

/** Tope de series en un grafico: pasado esto, los grupos chicos se juntan en "Otros". */
export const MAX_COLORED_GROUPS = 7;

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
 * Las primeras (o ultimas) N partidas de cada estudiante, o todas si no se pidio
 * una cantidad. Se cuentan despues de filtrar y de acotar por fechas, y por
 * separado en cada rango al comparar fechas: las primeras 4 de los ultimos 7 dias
 * son las 4 mas antiguas que jugo dentro de esos 7 dias. Quien jugo menos entra
 * con las que jugo. El orden es el numero de partida.
 */
export function pickPartida(
  attempts: AttemptRow[],
  partida: Partida,
  take: Take = "first",
): AttemptRow[] {
  if (partida === null) return attempts;

  const byStudent = new Map<string, AttemptRow[]>();

  for (const attempt of attempts) {
    const key = `${attempt.studentRut}|${attempt.range ?? ""}`;
    const list = byStudent.get(key) ?? [];

    list.push(attempt);
    byStudent.set(key, list);
  }

  const chosen = new Set<AttemptRow>();

  for (const list of byStudent.values()) {
    const ordered = [...list].sort((a, b) => a.attemptNumber - b.attemptNumber);

    for (const attempt of take === "first" ? ordered.slice(0, partida) : ordered.slice(-partida)) {
      chosen.add(attempt);
    }
  }

  // Se conserva el orden en que venian.
  return attempts.filter((attempt) => chosen.has(attempt));
}

export type GroupItem<T> = {
  item: T;
  rut: string;
  /** Al comparar por rangos de fechas: a cual rango pertenece. */
  range?: number;
  valueOf: (dimension: DimensionId) => string | null;
};

/**
 * Reparte elementos (partidas o estudiantes) en los grupos que se comparan.
 * Cada grupo conserva siempre su color; con mas de 7 grupos los chicos se
 * juntan en "Otros".
 */
export function groupItems<T>(
  items: GroupItem<T>[],
  request: Pick<ChartRequest, "groupBy" | "students"> & Partial<Pick<ChartRequest, "ranges" | "alsoBy">>,
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

  if (groupBy === "dateRange") {
    const specs: GroupSpec[] = (request.ranges ?? []).map((range, position) => ({
      key: `range-${position}`,
      label: formatDateRange(range),
      slot: position,
    }));
    const byGroup = new Map<string, T[]>(specs.map((spec) => [spec.key, []]));

    for (const entry of items) {
      if (entry.range !== undefined) byGroup.get(`range-${entry.range}`)?.push(entry.item);
    }

    return { specs, byGroup };
  }

  const dimension = groupBy;

  if ((request.alsoBy ?? []).length > 0) {
    return groupByCombination(items, [dimension, ...(request.alsoBy ?? [])]);
  }

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

/** Separador de las partes de la clave de un grupo combinado. */
const COMBINED_SEPARATOR = "|";

/** Compara dos combinaciones caracteristica por caracteristica; «sin dato» queda al final. */
function compareCombinations(dimensions: DimensionId[], a: string[], b: string[]): number {
  for (const [position, dimension] of dimensions.entries()) {
    const left = a[position] as string;
    const right = b[position] as string;

    if (left === right) continue;
    if (left === NO_DATA_KEY) return 1;
    if (right === NO_DATA_KEY) return -1;

    return compareValues(dimension, left, right);
  }

  return 0;
}

/**
 * Grupos que cruzan varias caracteristicas (universidad y genero, por ejemplo).
 * Cada combinacion que existe es un grupo; con mas de MAX_COLORED_GROUPS se
 * quedan las de mas estudiantes y el resto va a «Otros». Lo que no tiene una
 * de las caracteristicas queda en «Sin dato» dentro de su combinacion.
 */
function groupByCombination<T>(items: GroupItem<T>[], dimensions: DimensionId[]): Grouped<T> {
  const partsOf = new Map<string, string[]>();
  const members = new Map<string, Set<string>>();
  const keyByItem = new Map<T, string>();

  for (const entry of items) {
    const parts = dimensions.map((dimension) => entry.valueOf(dimension) ?? NO_DATA_KEY);
    const key = parts.join(COMBINED_SEPARATOR);
    const set = members.get(key) ?? new Set<string>();

    set.add(entry.rut);
    members.set(key, set);
    partsOf.set(key, parts);
    keyByItem.set(entry.item, key);
  }

  const ordered = [...members.keys()].sort((a, b) =>
    compareCombinations(dimensions, partsOf.get(a) as string[], partsOf.get(b) as string[]),
  );

  const biggest = new Set(
    [...ordered]
      .sort((a, b) => (members.get(b)?.size ?? 0) - (members.get(a)?.size ?? 0))
      .slice(0, MAX_COLORED_GROUPS),
  );
  const shown = ordered.length > MAX_COLORED_GROUPS ? ordered.filter((key) => biggest.has(key)) : ordered;

  const specs: GroupSpec[] = shown.map((key, position) => ({
    key,
    label: (partsOf.get(key) as string[])
      .map((part, index) =>
        part === NO_DATA_KEY ? NO_DATA_LABEL : dimensionValueLabel(dimensions[index] as DimensionId, part),
      )
      .join(" · "),
    slot: position,
  }));

  if (shown.length < ordered.length) specs.push({ key: OTHERS_KEY, label: OTHERS_LABEL, slot: -1 });

  const byGroup = new Map<string, T[]>(specs.map((spec) => [spec.key, []]));

  for (const entry of items) {
    const key = keyByItem.get(entry.item) as string;

    byGroup.get(shown.includes(key) ? key : OTHERS_KEY)?.push(entry.item);
  }

  return { specs, byGroup };
}
