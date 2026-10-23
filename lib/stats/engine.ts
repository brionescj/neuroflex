import {
  ageOf,
  deviceOfAttempt,
  dimensionValue,
} from "./dimensions";
import { mean, median, percentOf, round } from "./numbers";
import {
  ABANDON_AFTER_MS,
  attemptPasses,
  attemptValueOf,
  groupItems,
  passesAge,
  passesFilters,
  pickPartida,
  type GroupItem,
  type Grouped,
} from "./pipeline";
import {
  PERIOD_LABELS,
  formatDateRange,
  periodStart,
  rangeWindow,
  type Bucket,
} from "./time";
import {
  GAME_IDS,
  GAME_LABELS,
  type AttemptRow,
  type ChartId,
  type ChartOptionDef,
  type ChartRequest,
  type ChartResult,
  type ChartSeries,
  type ChartUnit,
  type DimensionId,
  type GameId,
  type ResultRow,
  type StatGame,
  type StatsData,
  type StudentRow,
  type ViewId,
} from "./types";

/** Lo que cada grafico calcula; el resto del resultado lo completa `buildChart`. */
export type Built = Pick<
  ChartResult,
  | "xLabel"
  | "yLabel"
  | "unit"
  | "unitLabel"
  | "categories"
  | "series"
  | "notes"
  | "studentsTotal"
> &
  Partial<Pick<ChartResult, "table" | "cards">>;

export type ChartDef = {
  id: ChartId;
  game: StatGame;
  title: string;
  blurb: string;
  /** Formas de ver el grafico (la primera es la de partida); puede depender de las opciones. */
  views: ViewId[] | ((options: Record<string, string>) => ViewId[]);
  /** Si se puede comparar por grupos (una lista de estudiantes no). Por defecto si. */
  compare?: boolean;
  /** Indicador exploratorio: se muestra con un aviso de que orienta pero no concluye. */
  exploratory?: boolean;
  /** Si cuenta la eleccion del numero de partida (o todas). */
  usesPartida: boolean;
  /** Si acepta el periodo sin elegir partida (graficos que cuentan partidas o fechas por si mismos). */
  usesPeriod?: boolean;
  /** Si se puede separar y filtrar por dispositivo (necesita partidas, no fichas). */
  supportsDevice: boolean;
  options: ChartOptionDef[];
  build: (ctx: Ctx) => Built;
};

export type Ctx = {
  request: ChartRequest;
  data: StatsData;
  now: Date;
  students: Map<string, StudentRow>;
  options: Record<string, string>;
};

/**
 * Lo que se cuenta en un grafico: un estudiante (con una o varias partidas
 * juntas) o, si se pidio contar partidas, una sola partida. `attempt` es la
 * partida de la que salen sus caracteristicas (la mas reciente).
 */
export type Unit = { attempt: AttemptRow; attempts: AttemptRow[]; results: ResultRow[] };

export const AS_OPTION: ChartOptionDef = {
  id: "as",
  label: "Mostrar como",
  default: "auto",
  choices: [
    { value: "auto", label: "Automático" },
    { value: "count", label: "Cantidad" },
    { value: "percent", label: "Porcentaje" },
  ],
};

export const GAME_OPTION: ChartOptionDef = {
  id: "game",
  label: "Juego",
  default: "all",
  choices: [
    { value: "all", label: "Todos" },
    ...GAME_IDS.map((id) => ({ value: id, label: GAME_LABELS[id] })),
  ],
};

export const BUCKET_OPTION: ChartOptionDef = {
  id: "bucket",
  label: "Agrupar por",
  default: "week",
  choices: [
    { value: "day", label: "Día" },
    { value: "week", label: "Semana" },
    { value: "month", label: "Mes" },
  ],
};

// ---------------------------------------------------------------- utilidades

export function distinctStudents<T>(items: T[], rutOf: (item: T) => string): number {
  return new Set(items.map(rutOf)).size;
}

export function seriesOf<T>(
  grouped: Grouped<T>,
  rutOf: (item: T) => string,
  categoryCount: number,
  cell: (items: T[], category: number) => { value: number | null; n: number },
): ChartSeries[] {
  return grouped.specs.map((spec) => {
    const items = grouped.byGroup.get(spec.key) ?? [];
    const cells = Array.from({ length: categoryCount }, (_, i) => cell(items, i));

    return {
      key: spec.key,
      label: spec.label,
      slot: spec.slot,
      n: distinctStudents(items, rutOf),
      values: cells.map((c) => round(c.value)),
      ns: cells.map((c) => c.n),
    };
  });
}

export function totalStudents<T>(grouped: Grouped<T>, rutOf: (item: T) => string): number {
  const all = new Set<string>();

  for (const items of grouped.byGroup.values()) {
    for (const item of items) all.add(rutOf(item));
  }

  return all.size;
}

/** Una ventana de tiempo: desde (incluido) hasta (excluido); null = sin limite por ese lado. */
export type Window = { from: Date | null; until: Date | null };

/** Si la partida empezo dentro de la ventana. */
export function inWindow(attempt: AttemptRow, window: Window): boolean {
  return (
    (window.from === null || attempt.startedAt >= window.from) &&
    (window.until === null || attempt.startedAt < window.until)
  );
}

/**
 * Las ventanas de tiempo del pedido: una sola (el periodo, el rango elegido o
 * todo el tiempo) o, al comparar por fechas, una por cada rango. `range` dice
 * a cual rango pertenece lo que cae en esa ventana.
 */
export function windowsOf(ctx: Ctx): { window: Window; range?: number }[] {
  const { request, now } = ctx;

  if (request.groupBy === "dateRange") {
    return request.ranges.map((range, index) => ({ window: rangeWindow(range), range: index }));
  }

  if (request.range) return [{ window: rangeWindow(request.range) }];

  return [{ window: { from: periodStart(request.period, now), until: null } }];
}

/** Las partidas que caen en las ventanas del pedido; con rangos, cada copia lleva su rango. */
function attemptsInWindows(ctx: Ctx, wanted: (attempt: AttemptRow) => boolean): AttemptRow[] {
  const kept: AttemptRow[] = [];

  for (const { window, range } of windowsOf(ctx)) {
    for (const attempt of ctx.data.attempts) {
      if (!wanted(attempt) || !inWindow(attempt, window)) continue;

      kept.push(range === undefined ? attempt : { ...attempt, range });
    }
  }

  return kept;
}

/** Partidas de un juego que pasan filtros y periodo, ya con la eleccion de partida y la unidad. */
export function gameUnits(ctx: Ctx, gameId: GameId): Unit[] {
  const { request, data, students } = ctx;

  const kept = attemptsInWindows(
    ctx,
    (attempt) => attempt.gameId === gameId && attemptPasses(request, attempt, students),
  );

  const chosen = pickPartida(kept, request.partida, request.take);
  const resultsBy = new Map<string, ResultRow[]>();

  for (const result of data.results) {
    if (result.gameId !== gameId) continue;

    const list = resultsBy.get(result.attemptId) ?? [];

    list.push(result);
    resultsBy.set(result.attemptId, list);
  }

  const perAttempt: Unit[] = chosen
    .map((attempt) => ({
      attempt,
      attempts: [attempt],
      results: resultsBy.get(attempt.attemptId) ?? [],
    }))
    .filter((unit) => unit.results.length > 0);

  if (request.countBy !== "students") return perAttempt;

  // Todas las partidas de un estudiante juntas: cuenta una vez. Al comparar por
  // dispositivo se junta por estudiante y aparato: quien jugo en un celular y
  // en un notebook aparece en ambos grupos, cada uno con lo que jugo ahi (si no,
  // todo quedaria en el aparato de su ultima partida). Con rangos de fechas, por
  // estudiante y rango.
  const byDevice = request.groupBy === "device";
  const byRange = request.groupBy === "dateRange";
  const byStudent = new Map<string, Unit>();

  for (const unit of [...perAttempt].sort(
    (a, b) => a.attempt.attemptNumber - b.attempt.attemptNumber,
  )) {
    const key = byDevice
      ? `${unit.attempt.studentRut}|${deviceOfAttempt(unit.attempt) ?? ""}`
      : byRange
        ? `${unit.attempt.studentRut}|${unit.attempt.range}`
        : unit.attempt.studentRut;
    const current = byStudent.get(key);

    if (!current) {
      byStudent.set(key, { ...unit, attempts: [...unit.attempts] });
      continue;
    }

    current.attempt = unit.attempt;
    current.attempts.push(...unit.attempts);
    current.results.push(...unit.results);
  }

  return [...byStudent.values()];
}

export function groupUnits(ctx: Ctx, units: Unit[]): Grouped<Unit> {
  const items: GroupItem<Unit>[] = units.map((unit) => ({
    item: unit,
    rut: unit.attempt.studentRut,
    range: unit.attempt.range,
    valueOf: attemptValueOf(unit.attempt, ctx.students),
  }));

  return groupItems(items, ctx.request, ctx.students);
}

export const unitRut = (unit: Unit) => unit.attempt.studentRut;

export function countsAttempts(ctx: Ctx): boolean {
  return ctx.request.countBy === "attempts";
}

export function unitLabelOf(ctx: Ctx): string {
  return countsAttempts(ctx) ? "partidas" : "estudiantes";
}

/** Como se eligieron las partidas y que se cuenta; los avisos de periodo y dispositivo van aparte. */
export function partidaNote(ctx: Ctx): string {
  const { partida, take, groupBy, range } = ctx.request;
  const inside =
    groupBy === "dateRange" ? " dentro de cada rango" : ctx.request.period === "all" && !range ? "" : " dentro del período elegido";

  if (partida !== null) {
    if (partida === 1) {
      return `Se usa la ${take === "first" ? "primera" : "última"} partida de cada estudiante${inside}. Quien no jugó ninguna no cuenta.`;
    }

    const counted = countsAttempts(ctx)
      ? "Se cuenta cada partida por separado: un estudiante con varias partidas pesa más."
      : "Cada estudiante cuenta una sola vez.";

    return `Se usan las ${partida} partidas ${take === "first" ? "más antiguas" : "más recientes"} de cada estudiante${inside}. Quien jugó menos entra con las que jugó. ${counted}`;
  }

  return countsAttempts(ctx)
    ? "Se cuenta cada partida por separado: un estudiante con varias partidas pesa más."
    : "Se juntan todas las partidas de cada estudiante: cada uno cuenta una sola vez.";
}

export function periodNote(ctx: Ctx): string | null {
  const { groupBy, range, period } = ctx.request;

  if (groupBy === "dateRange") {
    return "Cada grupo es un rango de fechas, según el día en que empezó cada partida (hora de Chile). Si los rangos se cruzan, una partida aparece en cada uno.";
  }

  if (range) {
    return `Período: del ${formatDateRange(range)}, según el día en que empezó cada partida (hora de Chile).`;
  }

  return period === "all"
    ? null
    : `Período: ${PERIOD_LABELS[period].toLowerCase()}, según el día en que empezó cada partida (hora de Chile).`;
}

/** Notas de contexto que comparten los graficos por partida. */
export function contextNotes(ctx: Ctx): string[] {
  return [partidaNote(ctx), periodNote(ctx)].filter((note): note is string => note !== null);
}

/** Las partidas de un estudiante en un nivel o caso: la de menor intento de cada partida. */
export function ownResults(unit: Unit, matches: (r: ResultRow) => boolean): ResultRow[] {
  const found: ResultRow[] = [];

  for (const attempt of unit.attempts) {
    const best = firstResultAt(
      { ...unit, results: unit.results.filter((r) => r.attemptId === attempt.attemptId) },
      matches,
    );

    if (best) found.push(best);
  }

  return found;
}

export function asOf(ctx: Ctx): "count" | "percent" {
  const chosen = ctx.options.as;

  if (chosen === "count" || chosen === "percent") return chosen;

  return ctx.request.groupBy === "none" ? "count" : "percent";
}

export function secondsOf(ms: number): number {
  return ms / 1000;
}

export function maxIndex(units: Unit[]): number {
  let max = 0;

  for (const unit of units) {
    for (const result of unit.results) max = Math.max(max, result.index);
  }

  return max;
}

/** El resultado de un nivel o caso por unidad: el de menor numero de intento. */
export function firstResultAt(unit: Unit, matches: (r: ResultRow) => boolean): ResultRow | null {
  let best: ResultRow | null = null;

  for (const result of unit.results) {
    if (matches(result) && (!best || result.tryNumber < best.tryNumber)) {
      best = result;
    }
  }

  return best;
}

export function numberMetric(result: ResultRow, name: string): number | null {
  const value = result.metrics[name];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// ----------------------------------------------------- distribucion por nivel

/** Cuantos estudiantes tuvieron como maximo el nivel L, en cantidad o porcentaje. */
export function distribution(
  ctx: Ctx,
  gameId: GameId,
  levelOf: (unit: Unit) => number,
  firstLevel: number,
  xLabel: string,
  extraNotes: string[],
): Built {
  const units = gameUnits(ctx, gameId);
  const grouped = groupUnits(ctx, units);
  const top = Math.max(firstLevel, ...units.map(levelOf));
  const levels = Array.from({ length: top - firstLevel + 1 }, (_, i) => i + firstLevel);
  const mode = asOf(ctx);

  return {
    xLabel,
    yLabel:
      mode === "percent"
        ? `% de ${unitLabelOf(ctx)}`
        : unitLabelOf(ctx) === "partidas"
          ? "Partidas"
          : "Estudiantes",
    unit: mode === "percent" ? "percent" : "students",
    unitLabel: unitLabelOf(ctx),
    categories: levels.map(String),
    series: seriesOf(grouped, unitRut, levels.length, (group, i) => {
      const count = group.filter((unit) => levelOf(unit) === levels[i]).length;

      return {
        value: mode === "percent" ? percentOf(count, group.length) : count,
        n: group.length,
      };
    }),
    notes: [...contextNotes(ctx), ...extraNotes],
    studentsTotal: totalStudents(grouped, unitRut),
  };
}

export function levelsRange(units: Unit[]): number[] {
  const top = maxIndex(units);

  return Array.from({ length: top }, (_, i) => i + 1);
}

export function timePerLevel(
  ctx: Ctx,
  gameId: GameId,
  firstTryOnly: boolean,
  note: string,
): Built {
  const units = gameUnits(ctx, gameId);
  const grouped = groupUnits(ctx, units);
  const levels = levelsRange(units);

  return {
    xLabel: "Nivel",
    yLabel: "Segundos (mediana)",
    unit: "seconds",
    unitLabel: unitLabelOf(ctx),
    categories: levels.map(String),
    series: seriesOf(grouped, unitRut, levels.length, (group, i) => {
      const level = levels[i] as number;
      const times: number[] = [];

      for (const unit of group) {
        const own = ownResults(
          unit,
          (r) => r.index === level && (!firstTryOnly || r.tryNumber === 1),
        );

        // Un estudiante con varias partidas aporta la mediana de sus tiempos.
        if (own.length > 0) times.push(median(own.map((r) => secondsOf(r.activeMsNet))) as number);
      }

      return { value: median(times), n: times.length };
    }),
    notes: [
      ...contextNotes(ctx),
      note,
      "Es el tiempo con la pantalla visible, sin contar pausas de más de 80 segundos.",
    ],
    studentsTotal: totalStudents(grouped, unitRut),
  };
}

/** Casos en el orden en que se juegan, con su titulo. */
export function caseCategories(ctx: Ctx, units: Unit[]): { keys: string[]; labels: string[] } {
  const firstIndex = new Map<string, number>();

  for (const unit of units) {
    for (const result of unit.results) {
      const current = firstIndex.get(result.key);

      if (current === undefined || result.index < current) {
        firstIndex.set(result.key, result.index);
      }
    }
  }

  const keys = [...firstIndex.keys()].sort(
    (a, b) => (firstIndex.get(a) as number) - (firstIndex.get(b) as number) || a.localeCompare(b),
  );

  return { keys, labels: keys.map((key) => ctx.data.caseTitles[key] ?? key) };
}

export function perCase(
  ctx: Ctx,
  measure: (result: ResultRow) => number | null,
  summarize: (values: number[]) => number | null,
  yLabel: string,
  unit: ChartUnit,
  notes: string[],
): Built {
  const units = gameUnits(ctx, "mini-cases");
  const grouped = groupUnits(ctx, units);
  const { keys, labels } = caseCategories(ctx, units);

  return {
    xLabel: "Caso",
    yLabel,
    unit,
    unitLabel: unitLabelOf(ctx),
    categories: labels,
    series: seriesOf(grouped, unitRut, keys.length, (group, i) => {
      const values: number[] = [];

      for (const entry of group) {
        const own = ownResults(entry, (r) => r.key === keys[i])
          .map((r) => measure(r))
          .filter((v): v is number => v !== null);

        // Con varias partidas del mismo estudiante se promedia su resultado en el caso.
        const value = unit === "seconds" ? median(own) : mean(own);

        if (value !== null) values.push(value);
      }

      return { value: summarize(values), n: values.length };
    }),
    notes: [...contextNotes(ctx), ...notes],
    studentsTotal: totalStudents(grouped, unitRut),
  };
}

export type TimeBase = {
  grouped: Grouped<AttemptRow>;
};

export function timeBase(ctx: Ctx): TimeBase {
  const game = ctx.options.game;
  const attempts = ctx.data.attempts.filter(
    (attempt) =>
      (game === "all" || attempt.gameId === game) &&
      attemptPasses(ctx.request, attempt, ctx.students),
  );

  const items: GroupItem<AttemptRow>[] = attempts.map((attempt) => ({
    item: attempt,
    rut: attempt.studentRut,
    valueOf: attemptValueOf(attempt, ctx.students),
  }));

  return { grouped: groupItems(items, ctx.request, ctx.students) };
}

export function gameNote(ctx: Ctx): string {
  const game = ctx.options.game;

  return game === "all"
    ? "Se suman los tres juegos."
    : `Solo ${GAME_LABELS[game as GameId]}.`;
}

export function bucketOf(ctx: Ctx): Bucket {
  const bucket = ctx.options.bucket;

  return bucket === "day" || bucket === "month" ? bucket : "week";
}

export function isAbandoned(attempt: AttemptRow, now: Date): boolean {
  return (
    attempt.status === "in_progress" &&
    now.getTime() - attempt.lastActivityAt.getTime() > ABANDON_AFTER_MS
  );
}


// ------------------------------------------------------ composiciones y tramos

/** Cuantos niveles se miran en los graficos que se pueden acotar por tramo. */
export const LEVEL_BAND_OPTION: ChartOptionDef = {
  id: "levels",
  label: "Niveles",
  default: "all",
  choices: [
    { value: "all", label: "Todos los niveles" },
    { value: "1-5", label: "Niveles 1 a 5" },
    { value: "6-10", label: "Niveles 6 a 10" },
    { value: "11+", label: "Niveles 11 o más" },
  ],
};

export function inLevelBand(level: number, band: string | undefined): boolean {
  switch (band) {
    case "1-5":
      return level >= 1 && level <= 5;
    case "6-10":
      return level >= 6 && level <= 10;
    case "11+":
      return level >= 11;
    default:
      return true;
  }
}

export function levelBandNote(ctx: Ctx): string | null {
  const label = LEVEL_BAND_OPTION.choices.find((c) => c.value === ctx.options.levels)?.label;

  return ctx.options.levels && ctx.options.levels !== "all" && label ? `Solo ${label.toLowerCase()}.` : null;
}

/**
 * Serie de un grafico de composicion: cada categoria es una parte de un total
 * por grupo. `partsOf` devuelve la cantidad de cada categoria para un grupo.
 */
export function compositionSeries<T>(
  grouped: Grouped<T>,
  rutOf: (item: T) => string,
  categoryCount: number,
  partsOf: (items: T[]) => number[],
  mode: "count" | "percent",
): ChartSeries[] {
  return grouped.specs.map((spec) => {
    const items = grouped.byGroup.get(spec.key) ?? [];
    const parts = partsOf(items);
    const total = parts.reduce((sum, part) => sum + part, 0);

    return {
      key: spec.key,
      label: spec.label,
      slot: spec.slot,
      n: distinctStudents(items, rutOf),
      values: Array.from({ length: categoryCount }, (_, i) =>
        round(mode === "percent" ? percentOf(parts[i] ?? 0, total) : (parts[i] ?? 0)),
      ),
      ns: Array.from({ length: categoryCount }, (_, i) => parts[i] ?? 0),
    };
  });
}

/** Vistas de un grafico que reparte un total en partes. */
export const COMPOSITION_VIEWS: ViewId[] = ["bars", "pie", "stacked"];

/** Estudiantes habilitados que cumplen los filtros de ficha, repartidos en los grupos pedidos. */
export function cohortOf(ctx: Ctx): Grouped<StudentRow> {
  const { request, data, now } = ctx;
  const valueOfStudent = (student: StudentRow) => (dim: DimensionId) =>
    dimensionValue(dim, student, null, now);

  const cohort = data.students.filter(
    (student) =>
      student.enabled !== false &&
      passesFilters(request.filters, valueOfStudent(student)) &&
      passesAge(request.ageRange, ageOf(student, null, now)),
  );

  return groupItems(
    cohort.map((student) => ({
      item: student,
      rut: student.rut,
      valueOf: valueOfStudent(student),
    })),
    request,
    ctx.students,
  );
}

export const FICHA_NOTE =
  "Aquí los grupos salen de la ficha actual del estudiante, no de la foto de cada partida.";

/** Partidas que pasan filtros y periodo (sin elegir primera o ultima), opcionalmente de un juego. */
export function periodAttempts(ctx: Ctx, game: string | undefined): AttemptRow[] {
  return attemptsInWindows(
    ctx,
    (attempt) =>
      (game === undefined || game === "all" || attempt.gameId === game) &&
      attemptPasses(ctx.request, attempt, ctx.students),
  );
}

export function groupAttempts(ctx: Ctx, attempts: AttemptRow[]): Grouped<AttemptRow> {
  return groupItems(
    attempts.map((attempt) => ({
      item: attempt,
      rut: attempt.studentRut,
      range: attempt.range,
      valueOf: attemptValueOf(attempt, ctx.students),
    })),
    ctx.request,
    ctx.students,
  );
}

/** Rotulo de una unidad de conteo para el eje: "Estudiantes" o "Partidas". */
export function countLabel(unitLabel: string): string {
  return unitLabel.charAt(0).toUpperCase() + unitLabel.slice(1);
}

/** Una medida por nivel (mediana por estudiante, primer intento): ritmo de respuesta, etc. */
export function metricPerLevel(
  ctx: Ctx,
  gameId: GameId,
  measure: (result: ResultRow) => number | null,
  yLabel: string,
  unit: ChartUnit,
  notes: string[],
): Built {
  const units = gameUnits(ctx, gameId);
  const grouped = groupUnits(ctx, units);
  const levels = levelsRange(units);

  return {
    xLabel: "Nivel",
    yLabel,
    unit,
    unitLabel: unitLabelOf(ctx),
    categories: levels.map(String),
    series: seriesOf(grouped, unitRut, levels.length, (group, i) => {
      const level = levels[i] as number;
      const values: number[] = [];

      for (const unit of group) {
        const own = ownResults(unit, (r) => r.index === level && r.tryNumber === 1)
          .map(measure)
          .filter((v): v is number => v !== null);
        const value = median(own);

        if (value !== null) values.push(value);
      }

      return { value: median(values), n: values.length };
    }),
    notes: [...contextNotes(ctx), ...notes],
    studentsTotal: totalStudents(grouped, unitRut),
  };
}
