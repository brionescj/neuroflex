import { MAX_STUDENT_AGE, MIN_STUDENT_AGE } from "../studentFields";
import { findChart, type ChartDef } from "./charts";
import { DIMENSION_IDS, FILTER_DIMENSIONS } from "./dimensions";
import { PERIODS } from "./time";
import type {
  AgeRange,
  ChartRequest,
  CountBy,
  DimensionId,
  Filters,
  GroupBy,
  Partida,
  Period,
} from "./types";

export const MAX_COMPARED_STUDENTS = 6;

const MAX_PARAM_LENGTH = 6_000;
const MAX_FILTER_VALUES = 60;
const MAX_VALUE_LENGTH = 80;
const RUT_LIKE = /^[0-9kK.-]{3,12}$/;

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
    !(DIMENSION_IDS as readonly string[]).includes(groupBy)
  ) {
    return fail("La forma de comparar no es válida.");
  }

  const partidaRaw = single(query.partida) ?? "first";

  if (partidaRaw !== "first" && partidaRaw !== "last" && partidaRaw !== "all") {
    return fail("La partida elegida no es válida.");
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

  if (!def.supportsDevice) {
    if (groupBy === "device" || filters.device) {
      return fail("Este gráfico no se puede separar ni filtrar por dispositivo.");
    }
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
      partida: partidaRaw as Partida,
      countBy: countByRaw as CountBy,
      period: periodRaw as Period,
      filters,
      ageRange: ageRange ?? null,
      students: groupBy === "student" ? students : [],
      options,
    },
  };
}
