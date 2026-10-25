import { MAX_STUDENT_AGE, MIN_STUDENT_AGE } from "../studentFields";
import { findChart, type ChartDef } from "./charts";
import { DIMENSION_IDS, FILTER_DIMENSIONS } from "./dimensions";
import { MAX_DATE_RANGES, PERIODS, isDateKey, type DateRange } from "./time";
import type {
  AgeRange,
  ChartRequest,
  CountBy,
  DimensionId,
  Filters,
  GroupBy,
  Partida,
  Take,
  Period,
} from "./types";
import { MAX_PARTIDA } from "./types";

export const MAX_COMPARED_STUDENTS = 6;

/** Cuantas caracteristicas extra se cruzan con la principal (3 en total). */
export const MAX_ALSO_BY = 2;

const MAX_PARAM_LENGTH = 6_000;
const MAX_FILTER_VALUES = 60;
const MAX_VALUE_LENGTH = 80;
export const RUT_LIKE = /^[0-9kK.-]{3,12}$/;

export type ParsedRequest =
  | { ok: true; request: ChartRequest; def: ChartDef }
  | { ok: false; message: string };

function fail(message: string): ParsedRequest {
  return { ok: false, message };
}

function single(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

/** Un parametro que viaja como texto JSON (o ya como objeto, en los tests). */
function readJson(raw: unknown): { ok: true; value: unknown } | { ok: false } {
  const value = single(raw);

  if (value === undefined || value === "") return { ok: true, value: undefined };
  if (typeof value !== "string") return { ok: true, value };
  if (value.length > MAX_PARAM_LENGTH) return { ok: false };

  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

function parseFilters(raw: unknown): Filters | null {
  const json = readJson(raw);

  if (!json.ok) return null;
  if (json.value === undefined) return {};

  const input = json.value;

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }

  const filters: Filters = {};

  for (const [key, values] of Object.entries(input)) {
    if (!(FILTER_DIMENSIONS as readonly string[]).includes(key)) return null;

    if (
      !Array.isArray(values) ||
      values.length > MAX_FILTER_VALUES ||
      !values.every((v) => typeof v === "string" && v.length <= MAX_VALUE_LENGTH)
    ) {
      return null;
    }

    if (values.length > 0) filters[key as DimensionId] = values as string[];
  }

  return filters;
}

/** Los mismos limites que al ingresar un estudiante: nadie queda fuera del rango. */
export const MIN_AGE = MIN_STUDENT_AGE;
export const MAX_AGE = MAX_STUDENT_AGE;

/** undefined = no se pidio; null = invalido. */
function parseAgeRange(raw: unknown): AgeRange | null | undefined {
  const json = readJson(raw);

  if (!json.ok) return null;
  if (json.value === undefined) return undefined;

  const input = json.value;

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }

  const { min = null, max = null } = input as Record<string, unknown>;
  const valid = (v: unknown) =>
    v === null || (Number.isInteger(v) && (v as number) >= MIN_AGE && (v as number) <= MAX_AGE);

  if (!valid(min) || !valid(max)) return null;
  if (min !== null && max !== null && (min as number) > (max as number)) return null;
  if (min === null && max === null) return undefined;

  return { min: min as number | null, max: max as number | null };
}

function readRange(value: unknown): DateRange | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const { from, to } = value as Record<string, unknown>;

  if (!isDateKey(from) || !isDateKey(to) || from > to) return null;

  return { from, to };
}

/** undefined = no se pidio; null = invalido. */
function parseRange(raw: unknown): DateRange | null | undefined {
  const json = readJson(raw);

  if (!json.ok) return null;
  if (json.value === undefined) return undefined;

  return readRange(json.value);
}

/** Los rangos que se comparan: de 2 a MAX_DATE_RANGES, cada uno valido. null = invalido. */
function parseRanges(raw: unknown): DateRange[] | null {
  const json = readJson(raw);

  if (!json.ok) return null;
  if (json.value === undefined) return [];

  const list = json.value;

  if (!Array.isArray(list) || list.length > MAX_DATE_RANGES) return null;

  const ranges = list.map(readRange);

  return ranges.every((range): range is DateRange => range !== null) ? ranges : null;
}

/** Las caracteristicas que se cruzan con la principal. null = invalido. */
function parseAlsoBy(raw: unknown, groupBy: GroupBy): DimensionId[] | null {
  const json = readJson(raw);

  if (!json.ok) return null;
  if (json.value === undefined) return [];

  const list = json.value;

  if (!Array.isArray(list) || list.length > MAX_ALSO_BY) return null;
  if (list.length === 0) return [];

  // Solo se cruzan caracteristicas, y el dispositivo parte las partidas por aparato: va solo.
  if (groupBy === "none" || groupBy === "student" || groupBy === "dateRange" || groupBy === "device") return null;

  const valid = list.every(
    (v): v is DimensionId =>
      typeof v === "string" && v !== "device" && v !== groupBy && (DIMENSION_IDS as readonly string[]).includes(v),
  );

  return valid && new Set(list).size === list.length ? (list as DimensionId[]) : null;
}

function parseStudents(raw: unknown): string[] | null {
  const json = readJson(raw);

  if (!json.ok) return null;
  if (json.value === undefined) return [];

  if (
    !Array.isArray(json.value) ||
    !json.value.every((v) => typeof v === "string" && RUT_LIKE.test(v))
  ) {
    return null;
  }

  return [...new Set(json.value as string[])];
}

/**
 * Lee y valida los parametros de un grafico. Todo viene del navegador: nada se
 * da por bueno, y lo que falte se completa con los valores por defecto.
 */
export function parseChartRequest(query: Record<string, unknown>): ParsedRequest {
  const chartId = single(query.chart);
  const def = typeof chartId === "string" ? findChart(chartId) : undefined;

  if (!def) return fail("El gráfico pedido no existe.");

  const groupByRaw = single(query.groupBy) ?? "none";
  const groupBy = groupByRaw as GroupBy;

  if (
    groupBy !== "none" &&
    groupBy !== "student" &&
    groupBy !== "dateRange" &&
    !(DIMENSION_IDS as readonly string[]).includes(groupBy)
  ) {
    return fail("La forma de comparar no es válida.");
  }

  // Vacio o ausente = todas las partidas; un numero = cuantas partidas de cada estudiante (las primeras o las ultimas).
  const partidaRaw = single(query.partida) ?? "";
  let partida: Partida = null;

  if (partidaRaw !== "") {
    const number = typeof partidaRaw === "string" && /^\d{1,3}$/.test(partidaRaw) ? Number(partidaRaw) : NaN;

    if (!Number.isInteger(number) || number < 1 || number > MAX_PARTIDA) {
      return fail(`La partida debe ser un número entero de 1 a ${MAX_PARTIDA}.`);
    }

    partida = number;
  }

  const takeRaw = single(query.take) ?? "first";

  if (takeRaw !== "first" && takeRaw !== "last") {
    return fail("Elige si son las primeras o las últimas partidas.");
  }

  const countByRaw = single(query.countBy) ?? "students";

  if (countByRaw !== "students" && countByRaw !== "attempts") {
    return fail("La unidad a contar no es válida.");
  }

  const periodRaw = single(query.period) ?? "all";

  if (typeof periodRaw !== "string" || !(PERIODS as readonly string[]).includes(periodRaw)) {
    return fail("El período elegido no es válido.");
  }

  const filters = parseFilters(query.filters);

  if (filters === null) return fail("Los filtros no son válidos.");

  if (groupBy !== "none" && def.compare === false) {
    return fail("Este gráfico es una lista: no se compara por grupos.");
  }

  const range = parseRange(query.range);

  if (range === null) return fail("El rango de fechas no es válido: usa fechas que existan, con «desde» menor o igual que «hasta».");

  const ranges = parseRanges(query.ranges);

  if (ranges === null) {
    return fail(`Los rangos de fechas no son válidos: hasta ${MAX_DATE_RANGES}, cada uno con «desde» menor o igual que «hasta».`);
  }

  const datable = def.usesPartida || def.usesPeriod;

  if ((periodRaw !== "all" || range) && !datable) {
    return fail("Este gráfico no se puede acotar por período.");
  }

  if (range && periodRaw !== "all") {
    return fail("Elige un período o un rango de fechas, no los dos.");
  }

  if (groupBy === "dateRange") {
    if (!datable) return fail("Este gráfico no se puede comparar por fechas.");
    if (ranges.length < 2) return fail("Para comparar por fechas hacen falta al menos 2 rangos.");
    if (periodRaw !== "all" || range) {
      return fail("Al comparar por fechas cada grupo trae su rango: no se usa un período aparte.");
    }
  } else if (ranges.length > 0) {
    return fail("Los rangos de fechas solo se usan al comparar por fechas.");
  }

  if (!def.supportsDevice) {
    if (groupBy === "device" || filters.device) {
      return fail("Este gráfico no se puede separar ni filtrar por dispositivo.");
    }
  }

  const alsoBy = parseAlsoBy(query.alsoBy, groupBy);

  if (alsoBy === null) {
    return fail("Las características que se cruzan no son válidas: hasta 2 más, distintas entre sí y sin dispositivo.");
  }

  const ageRange = parseAgeRange(query.age);

  if (ageRange === null) {
    return fail(`La edad debe ser un rango de ${MIN_AGE} a ${MAX_AGE} años, con «desde» menor o igual que «hasta».`);
  }

  const students = parseStudents(query.students);

  if (students === null) return fail("Los estudiantes elegidos no son válidos.");

  if (groupBy === "student") {
    if (students.length === 0) {
      return fail("Elige al menos un estudiante para compararlo.");
    }

    if (students.length > MAX_COMPARED_STUDENTS) {
      return fail(`Puedes comparar hasta ${MAX_COMPARED_STUDENTS} estudiantes a la vez.`);
    }
  }

  const optionsJson = readJson(query.options);

  if (!optionsJson.ok) return fail("Las opciones no son válidas.");

  const given = optionsJson.value ?? {};

  if (typeof given !== "object" || given === null || Array.isArray(given)) {
    return fail("Las opciones no son válidas.");
  }

  const options: Record<string, string> = {};

  for (const option of def.options) {
    const value = (given as Record<string, unknown>)[option.id] ?? option.default;

    if (
      typeof value !== "string" ||
      !option.choices.some((choice) => choice.value === value)
    ) {
      return fail(`La opción «${option.label}» no es válida.`);
    }

    options[option.id] = value;
  }

  return {
    ok: true,
    def,
    request: {
      chart: def.id,
      groupBy,
      alsoBy,
      partida,
      take: takeRaw as Take,
      // Con una sola partida por estudiante, contar partidas y estudiantes es lo mismo.
      countBy: partida === 1 ? "students" : (countByRaw as CountBy),
      period: periodRaw as Period,
      range: range ?? null,
      ranges: groupBy === "dateRange" ? ranges : [],
      filters,
      ageRange: ageRange ?? null,
      students: groupBy === "student" ? students : [],
      options,
    },
  };
}
