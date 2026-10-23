import { isColorSequenceResultPassed } from "../gameAttempts";
import {
  NO_DATA_KEY,
  TABLET_MIN_SHORT_SIDE,
  ageOf,
  dimensionValue,
} from "./dimensions";
import { mean, median, percentOf, round } from "./numbers";
import {
  ABANDON_AFTER_MS,
  LOW_N,
  attemptPasses,
  attemptValueOf,
  groupItems,
  indexStudents,
  passesAge,
  passesFilters,
  pickPartida,
  type GroupItem,
  type Grouped,
} from "./pipeline";
import {
  bucketKey,
  bucketLabel,
  bucketRange,
  MAX_BUCKETS,
  PERIOD_LABELS,
  periodStart,
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
} from "./types";

/** Lo que cada grafico calcula; el resto del resultado lo completa `buildChart`. */
type Built = Pick<
  ChartResult,
  | "xLabel"
  | "yLabel"
  | "unit"
  | "unitLabel"
  | "categories"
  | "series"
  | "notes"
  | "studentsTotal"
>;

export type ChartDef = {
  id: ChartId;
  game: StatGame;
  title: string;
  blurb: string;
  kind: "bars" | "lines";
  /** Si cuenta la eleccion primera / ultima / todas las partidas. */
  usesPartida: boolean;
  /** Si se puede separar y filtrar por dispositivo (necesita partidas, no fichas). */
  supportsDevice: boolean;
  options: ChartOptionDef[];
  build: (ctx: Ctx) => Built;
};

type Ctx = {
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
type Unit = { attempt: AttemptRow; attempts: AttemptRow[]; results: ResultRow[] };

const AS_OPTION: ChartOptionDef = {
  id: "as",
  label: "Mostrar como",
  default: "auto",
  choices: [
    { value: "auto", label: "Automático" },
    { value: "count", label: "Cantidad" },
    { value: "percent", label: "Porcentaje" },
  ],
};

const GAME_OPTION: ChartOptionDef = {
  id: "game",
  label: "Juego",
  default: "all",
  choices: [
    { value: "all", label: "Todos" },
    ...GAME_IDS.map((id) => ({ value: id, label: GAME_LABELS[id] })),
  ],
};

const BUCKET_OPTION: ChartOptionDef = {
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

function distinctStudents<T>(items: T[], rutOf: (item: T) => string): number {
  return new Set(items.map(rutOf)).size;
}

function seriesOf<T>(
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
      lowN: false,
      values: cells.map((c) => round(c.value)),
      ns: cells.map((c) => c.n),
    };
  });
}

function totalStudents<T>(grouped: Grouped<T>, rutOf: (item: T) => string): number {
  const all = new Set<string>();

  for (const items of grouped.byGroup.values()) {
    for (const item of items) all.add(rutOf(item));
  }

  return all.size;
}

/** Si la partida empezo dentro del periodo pedido. */
function inPeriod(attempt: AttemptRow, from: Date | null): boolean {
  return from === null || attempt.startedAt >= from;
}

/** Partidas de un juego que pasan filtros y periodo, ya con la eleccion de partida y la unidad. */
function gameUnits(ctx: Ctx, gameId: GameId): Unit[] {
  const { request, data, students } = ctx;
  const from = periodStart(request.period, ctx.now);

  const kept = data.attempts.filter(
    (attempt) =>
      attempt.gameId === gameId &&
      inPeriod(attempt, from) &&
      attemptPasses(request, attempt, students),
  );

  const chosen = pickPartida(kept, request.partida);
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

  if (!(request.partida === "all" && request.countBy === "students")) return perAttempt;

  // Todas las partidas de un estudiante juntas: cuenta una vez.
  const byStudent = new Map<string, Unit>();

  for (const unit of [...perAttempt].sort(
    (a, b) => a.attempt.attemptNumber - b.attempt.attemptNumber,
  )) {
    const current = byStudent.get(unit.attempt.studentRut);

    if (!current) {
      byStudent.set(unit.attempt.studentRut, { ...unit, attempts: [...unit.attempts] });
      continue;
    }

    current.attempt = unit.attempt;
    current.attempts.push(...unit.attempts);
    current.results.push(...unit.results);
  }

  return [...byStudent.values()];
}

function groupUnits(ctx: Ctx, units: Unit[]): Grouped<Unit> {
  const items: GroupItem<Unit>[] = units.map((unit) => ({
    item: unit,
    rut: unit.attempt.studentRut,
    valueOf: attemptValueOf(unit.attempt, ctx.students),
  }));

  return groupItems(items, ctx.request, ctx.students);
}

const unitRut = (unit: Unit) => unit.attempt.studentRut;

function countsAttempts(ctx: Ctx): boolean {
  return ctx.request.partida === "all" && ctx.request.countBy === "attempts";
}

function unitLabelOf(ctx: Ctx): string {
  return countsAttempts(ctx) ? "partidas" : "estudiantes";
}

/** Como se eligieron las partidas y que se cuenta; los avisos de periodo y dispositivo van aparte. */
function partidaNote(ctx: Ctx): string {
  const { partida } = ctx.request;
  const inside = ctx.request.period === "all" ? "" : " del período elegido";

  if (partida === "first") return `Se usa la primera partida${inside} de cada estudiante.`;
  if (partida === "last") return `Se usa la última partida${inside} de cada estudiante.`;

  return countsAttempts(ctx)
    ? "Se cuenta cada partida por separado: un estudiante con varias partidas pesa más."
    : "Se juntan todas las partidas de cada estudiante: cada uno cuenta una sola vez.";
}

function periodNote(ctx: Ctx): string | null {
  return ctx.request.period === "all"
    ? null
    : `Período: ${PERIOD_LABELS[ctx.request.period].toLowerCase()}, según el día en que empezó cada partida (hora de Chile).`;
}

/** Notas de contexto que comparten los graficos por partida. */
function contextNotes(ctx: Ctx): string[] {
  return [partidaNote(ctx), periodNote(ctx)].filter((note): note is string => note !== null);
}

/** Las partidas de un estudiante en un nivel o caso: la de menor intento de cada partida. */
function ownResults(unit: Unit, matches: (r: ResultRow) => boolean): ResultRow[] {
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

function asOf(ctx: Ctx): "count" | "percent" {
  const chosen = ctx.options.as;

  if (chosen === "count" || chosen === "percent") return chosen;

  return ctx.request.groupBy === "none" ? "count" : "percent";
}

function secondsOf(ms: number): number {
  return ms / 1000;
}

function maxIndex(units: Unit[]): number {
  let max = 0;

  for (const unit of units) {
    for (const result of unit.results) max = Math.max(max, result.index);
  }

  return max;
}

/** El resultado de un nivel o caso por unidad: el de menor numero de intento. */
function firstResultAt(unit: Unit, matches: (r: ResultRow) => boolean): ResultRow | null {
  let best: ResultRow | null = null;

  for (const result of unit.results) {
    if (matches(result) && (!best || result.tryNumber < best.tryNumber)) {
      best = result;
    }
  }

  return best;
}

function numberMetric(result: ResultRow, name: string): number | null {
  const value = result.metrics[name];

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// ----------------------------------------------------- distribucion por nivel

/** Cuantos estudiantes tuvieron como maximo el nivel L, en cantidad o porcentaje. */
function distribution(
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

function levelsRange(units: Unit[]): number[] {
  const top = maxIndex(units);

  return Array.from({ length: top }, (_, i) => i + 1);
}

// --------------------------------------------------------------------- juegos

const csMaxLevel: ChartDef = {
  id: "cs-max-level",
  game: "color-sequence",
  title: "Nivel máximo superado",
  blurb:
    "En cada nivel hay que repetir una secuencia de colores más larga que en el anterior. Aquí se ve hasta qué nivel llegó cada estudiante, es decir, el más alto que superó.",
  kind: "bars",
  usesPartida: true,
  supportsDevice: true,
  options: [AS_OPTION],
  build: (ctx) =>
    distribution(
      ctx,
      "color-sequence",
      (unit) =>
        unit.results
          .filter((r) => isColorSequenceResultPassed(r))
          .reduce((max, r) => Math.max(max, r.index), 0),
      0,
      "Nivel máximo superado",
      ["El nivel 0 son los estudiantes que no superaron ningún nivel."],
    ),
};

const csPassRate: ChartDef = {
  id: "cs-pass-rate",
  game: "color-sequence",
  title: "Aprobación por nivel",
  blurb:
    "De los estudiantes que jugaron cada nivel, qué porcentaje lo superó. Puedes mirar solo el primer intento o contar hasta los 3 intentos que da el juego.",
  kind: "lines",
  usesPartida: true,
  supportsDevice: true,
  options: [
    {
      id: "measure",
      label: "Contar",
      default: "firstTry",
      choices: [
        { value: "firstTry", label: "Solo el primer intento" },
        { value: "anyTry", label: "Cualquiera de los 3 intentos" },
      ],
    },
  ],
  build: (ctx) => {
    const units = gameUnits(ctx, "color-sequence");
    const grouped = groupUnits(ctx, units);
    const levels = levelsRange(units);
    const firstTry = ctx.options.measure !== "anyTry";

    return {
      xLabel: "Nivel",
      yLabel: "% que lo superó",
      unit: "percent",
      unitLabel: unitLabelOf(ctx),
      categories: levels.map(String),
      series: seriesOf(grouped, unitRut, levels.length, (group, i) => {
        const level = levels[i] as number;
        let played = 0;
        let passed = 0;

        for (const unit of group) {
          const atLevel = unit.results.filter((r) => r.index === level);

          if (firstTry) {
            const firsts = atLevel.filter((r) => r.tryNumber === 1);

            if (firsts.length === 0) continue;

            played += 1;
            if (firsts.some((r) => isColorSequenceResultPassed(r))) passed += 1;
          } else {
            if (atLevel.length === 0) continue;

            played += 1;
            if (atLevel.some((r) => isColorSequenceResultPassed(r))) passed += 1;
          }
        }

        return { value: percentOf(passed, played), n: played };
      }),
      notes: [
        ...contextNotes(ctx),
        "En cada nivel solo cuentan quienes lo jugaron; por eso los niveles altos tienen pocos datos.",
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
  },
};

function timePerLevel(
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

const csTime: ChartDef = {
  id: "cs-time",
  game: "color-sequence",
  title: "Tiempo por nivel",
  blurb:
    "Tiempo mediano que tardan en responder cada nivel, contando solo el primer intento. La mediana es el valor del medio: unos pocos tiempos muy largos no la distorsionan.",
  kind: "lines",
  usesPartida: true,
  supportsDevice: true,
  options: [],
  build: (ctx) =>
    timePerLevel(ctx, "color-sequence", true, "Solo se mide el primer intento de cada nivel."),
};

const ncLevels: ChartDef = {
  id: "nc-levels",
  game: "node-connection",
  title: "Niveles completados",
  blurb:
    "Cuántos niveles de Conexión de nodos completó cada estudiante. Se muestra cuántos estudiantes llegaron hasta cada nivel.",
  kind: "bars",
  usesPartida: true,
  supportsDevice: true,
  options: [AS_OPTION],
  build: (ctx) =>
    distribution(
      ctx,
      "node-connection",
      (unit) => unit.results.reduce((max, r) => Math.max(max, r.index), 0),
      1,
      "Nivel más alto completado",
      [],
    ),
};

const ncTime: ChartDef = {
  id: "nc-time",
  game: "node-connection",
  title: "Tiempo por nivel",
  blurb:
    "Tiempo mediano que tardan en completar cada nivel de Conexión de nodos. La mediana es el valor del medio: unos pocos tiempos muy largos no la distorsionan.",
  kind: "lines",
  usesPartida: true,
  supportsDevice: true,
  options: [],
  build: (ctx) => timePerLevel(ctx, "node-connection", false, "Se mide el tiempo hasta completar cada nivel."),
};

/** Casos en el orden en que se juegan, con su titulo. */
function caseCategories(ctx: Ctx, units: Unit[]): { keys: string[]; labels: string[] } {
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

function perCase(
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

const mcSteps: ChartDef = {
  id: "mc-steps",
  game: "mini-cases",
  title: "Resultado por caso",
  blurb:
    "En cada mini caso hay que ordenar 4 pasos. Se puede ver el promedio de pasos puestos en su lugar correcto (de 0 a 4) o el porcentaje de estudiantes que ordenó el caso completo sin errores.",
  kind: "bars",
  usesPartida: true,
  supportsDevice: true,
  options: [
    {
      id: "measure",
      label: "Medir",
      default: "steps",
      choices: [
        { value: "steps", label: "Pasos correctos (promedio de 0 a 4)" },
        { value: "full", label: "% con el orden completo correcto" },
      ],
    },
  ],
  build: (ctx) =>
    ctx.options.measure === "full"
      ? perCase(
          ctx,
          (r) =>
            typeof r.metrics.isFullyCorrect === "boolean"
              ? r.metrics.isFullyCorrect
                ? 100
                : 0
              : null,
          mean,
          "% con orden completo",
          "percent",
          [],
        )
      : perCase(
          ctx,
          (r) => numberMetric(r, "correctSteps"),
          mean,
          "Pasos correctos (0 a 4)",
          "steps",
          [],
        ),
};

const mcTime: ChartDef = {
  id: "mc-time",
  game: "mini-cases",
  title: "Tiempo de decisión por caso",
  blurb:
    "Tiempo mediano que tardan en decidir el orden de los 4 pasos de cada caso, sin contar pausas largas de inactividad.",
  kind: "bars",
  usesPartida: true,
  supportsDevice: true,
  options: [],
  build: (ctx) =>
    perCase(
      ctx,
      (r) => secondsOf(r.activeMsNet),
      median,
      "Segundos (mediana)",
      "seconds",
      ["Es el tiempo con la pantalla visible, sin contar pausas de más de 80 segundos."],
    ),
};

// -------------------------------------------------------------------- general

const participation: ChartDef = {
  id: "participation",
  game: "general",
  title: "Participación por juego",
  blurb:
    "Cuántos estudiantes habilitados han comenzado (o terminado) cada juego, sobre el total de habilitados de cada grupo. Sirve para ver quién está usando la plataforma; no mide el desempeño.",
  kind: "bars",
  usesPartida: false,
  supportsDevice: false,
  options: [
    {
      id: "measure",
      label: "Contar",
      default: "started",
      choices: [
        { value: "started", label: "Los que comenzaron" },
        { value: "finished", label: "Los que terminaron" },
      ],
    },
    {
      id: "as",
      label: "Mostrar como",
      default: "percent",
      choices: [
        { value: "percent", label: "Porcentaje" },
        { value: "count", label: "Cantidad" },
      ],
    },
  ],
  build: (ctx) => {
    const { request, data, students, now } = ctx;
    const finishedOnly = ctx.options.measure === "finished";
    const asCount = ctx.options.as === "count";

    const valueOfStudent = (student: StudentRow) => (dim: DimensionId) =>
      dimensionValue(dim, student, null, now);

    const cohort = data.students.filter(
      (student) =>
        student.enabled !== false &&
        passesFilters(request.filters, valueOfStudent(student)) &&
        passesAge(request.ageRange, ageOf(student, null, now)),
    );

    const items: GroupItem<StudentRow>[] = cohort.map((student) => ({
      item: student,
      rut: student.rut,
      valueOf: valueOfStudent(student),
    }));

    const grouped = groupItems(items, request, students);

    const playedBy = new Map<GameId, Set<string>>();

    for (const game of GAME_IDS) playedBy.set(game, new Set());

    for (const attempt of data.attempts) {
      if (finishedOnly && attempt.status !== "finished") continue;

      playedBy.get(attempt.gameId)?.add(attempt.studentRut);
    }

    return {
      xLabel: "Juego",
      yLabel: asCount ? "Estudiantes" : "% de los estudiantes habilitados",
      unit: asCount ? "students" : "percent",
      unitLabel: "estudiantes",
      categories: GAME_IDS.map((id) => GAME_LABELS[id]),
      series: seriesOf(
        grouped,
        (student) => student.rut,
        GAME_IDS.length,
        (group, i) => {
          const played = playedBy.get(GAME_IDS[i] as GameId) as Set<string>;
          const count = group.filter((student) => played.has(student.rut)).length;

          return {
            value: asCount ? count : percentOf(count, group.length),
            n: group.length,
          };
        },
      ),
      notes: [
        "Aquí los grupos salen de la ficha actual del estudiante, no de la foto de cada partida.",
        finishedOnly
          ? "«Terminaron» es haber cerrado al menos una partida completa."
          : "«Comenzaron» es tener al menos una partida, aunque no la terminara.",
      ],
      studentsTotal: totalStudents(grouped, (student) => student.rut),
    };
  },
};

type TimeBase = {
  grouped: Grouped<AttemptRow>;
};

function timeBase(ctx: Ctx): TimeBase {
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

function gameNote(ctx: Ctx): string {
  const game = ctx.options.game;

  return game === "all"
    ? "Se suman los tres juegos."
    : `Solo ${GAME_LABELS[game as GameId]}.`;
}

function bucketOf(ctx: Ctx): Bucket {
  const bucket = ctx.options.bucket;

  return bucket === "day" || bucket === "month" ? bucket : "week";
}

const activity: ChartDef = {
  id: "activity",
  game: "general",
  title: "Actividad en el tiempo",
  blurb:
    "Cuántos estudiantes distintos jugaron al menos un nivel o caso en cada día, semana o mes. Sirve para ver el ritmo de uso de la plataforma.",
  kind: "lines",
  usesPartida: false,
  supportsDevice: true,
  options: [
    BUCKET_OPTION,
    GAME_OPTION,
    {
      id: "measure",
      label: "Contar",
      default: "students",
      choices: [
        { value: "students", label: "Estudiantes que jugaron" },
        { value: "levels", label: "Niveles o casos completados" },
      ],
    },
  ],
  build: (ctx) => {
    const bucket = bucketOf(ctx);
    const { grouped } = timeBase(ctx);
    const groupOfAttempt = new Map<string, string>();

    for (const [key, list] of grouped.byGroup) {
      for (const attempt of list) groupOfAttempt.set(attempt.attemptId, key);
    }

    const rows = ctx.data.results
      .filter((result) => groupOfAttempt.has(result.attemptId))
      .map((result) => ({
        group: groupOfAttempt.get(result.attemptId) as string,
        rut: result.studentRut,
        bucket: bucketKey(result.completedAt, bucket),
      }));

    const first = rows.reduce<string | null>(
      (min, row) => (min === null || row.bucket < min ? row.bucket : min),
      null,
    );

    const keys = bucketRange(first, ctx.now, bucket);
    const countLevels = ctx.options.measure === "levels";
    const inRange = new Set(keys);

    const series = grouped.specs.map((spec) => {
      const own = rows.filter((row) => row.group === spec.key && inRange.has(row.bucket));
      const values = keys.map((key) => {
        const here = own.filter((row) => row.bucket === key);

        return countLevels ? here.length : new Set(here.map((row) => row.rut)).size;
      });

      return {
        key: spec.key,
        label: spec.label,
        slot: spec.slot,
        n: new Set(
          (grouped.byGroup.get(spec.key) ?? []).map((attempt) => attempt.studentRut),
        ).size,
        lowN: false,
        values,
        ns: values,
      };
    });

    return {
      xLabel: bucket === "day" ? "Día" : bucket === "week" ? "Semana (desde el lunes)" : "Mes",
      yLabel: countLevels ? "Niveles o casos" : "Estudiantes",
      unit: "students",
      unitLabel: countLevels ? "niveles o casos" : "estudiantes",
      categories: keys.map((key) => bucketLabel(key, bucket)),
      series,
      notes: [
        gameNote(ctx),
        "Los días se cuentan en hora de Chile.",
        `Se muestran como máximo los últimos ${MAX_BUCKETS[bucket]} períodos.`,
      ],
      studentsTotal: totalStudents(grouped, (attempt) => attempt.studentRut),
    };
  },
};

function isAbandoned(attempt: AttemptRow, now: Date): boolean {
  return (
    attempt.status === "in_progress" &&
    now.getTime() - attempt.lastActivityAt.getTime() > ABANDON_AFTER_MS
  );
}

const abandonment: ChartDef = {
  id: "abandonment",
  game: "general",
  title: "Partidas abandonadas",
  blurb:
    "Partidas que quedaron a medias: sin terminar y sin actividad hace más de 4 horas. Cada una se ubica en el período de su última actividad. Si el estudiante retoma la partida, deja de contarse.",
  kind: "lines",
  usesPartida: false,
  supportsDevice: true,
  options: [BUCKET_OPTION, GAME_OPTION],
  build: (ctx) => {
    const bucket = bucketOf(ctx);
    const { grouped } = timeBase(ctx);

    const abandoned = grouped.specs.map((spec) => ({
      spec,
      list: (grouped.byGroup.get(spec.key) ?? []).filter((a) => isAbandoned(a, ctx.now)),
    }));

    const first = abandoned
      .flatMap((entry) => entry.list)
      .reduce<string | null>((min, attempt) => {
        const key = bucketKey(attempt.lastActivityAt, bucket);

        return min === null || key < min ? key : min;
      }, null);

    const keys = bucketRange(first, ctx.now, bucket);

    const series = abandoned.map(({ spec, list }) => {
      const values = keys.map(
        (key) => list.filter((a) => bucketKey(a.lastActivityAt, bucket) === key).length,
      );

      return {
        key: spec.key,
        label: spec.label,
        slot: spec.slot,
        n: new Set(
          (grouped.byGroup.get(spec.key) ?? []).map((a) => a.studentRut),
        ).size,
        lowN: false,
        values,
        ns: values,
      };
    });

    return {
      xLabel: bucket === "day" ? "Día" : bucket === "week" ? "Semana (desde el lunes)" : "Mes",
      yLabel: "Partidas abandonadas",
      unit: "students",
      unitLabel: "partidas",
      categories: keys.map((key) => bucketLabel(key, bucket)),
      series,
      notes: [
        gameNote(ctx),
        "Abandonada: sin terminar y sin actividad hace más de 4 horas.",
        "Una partida de hoy recién aparece cuando pasan 4 horas sin actividad.",
      ],
      studentsTotal: totalStudents(grouped, (attempt) => attempt.studentRut),
    };
  },
};

export const CHARTS: ChartDef[] = [
  participation,
  activity,
  abandonment,
  csMaxLevel,
  csPassRate,
  csTime,
  ncLevels,
  ncTime,
  mcSteps,
  mcTime,
];

export function findChart(id: string): ChartDef | undefined {
  return CHARTS.find((chart) => chart.id === id);
}

/**
 * Calcula un grafico. `options` ya viene validado y completado con los valores
 * por defecto (ver request.ts).
 */
export function buildChart(
  def: ChartDef,
  request: ChartRequest,
  data: StatsData,
  now: Date = new Date(),
): ChartResult {
  // Solo cuentan los estudiantes habilitados: los deshabilitados (o que ya no
  // estan en la base) quedan fuera de todos los graficos.
  const enabledStudents = data.students.filter((student) => student.enabled !== false);
  const enabled = new Set(enabledStudents.map((student) => student.rut));
  const scoped: StatsData = {
    ...data,
    students: enabledStudents,
    attempts: data.attempts.filter((attempt) => enabled.has(attempt.studentRut)),
    results: data.results.filter((result) => enabled.has(result.studentRut)),
  };

  const ctx: Ctx = {
    request,
    data: scoped,
    now,
    students: indexStudents(enabledStudents),
    options: request.options,
  };

  const built = def.build(ctx);
  const byStudent = request.groupBy === "student";

  const series = built.series.map((item) => ({
    ...item,
    // Al comparar estudiantes elegidos cada grupo es 1 a proposito.
    lowN: !byStudent && item.n < LOW_N,
  }));

  const notes = [...built.notes, "Solo se cuentan estudiantes habilitados."];

  if (request.groupBy === "device" || request.filters.device) {
    notes.push(
      `Dispositivo estimado con el tipo de pantalla y el tamaño de la ventana en la primera sesión de cada partida: Celular es táctil con el lado corto de la ventana menor a ${TABLET_MIN_SHORT_SIDE} px; Tableta es táctil de ${TABLET_MIN_SHORT_SIDE} px o más (una tableta no se cuenta como celular); Computador es con mouse, o un notebook táctil de pantalla ancha. Es una estimación, no el modelo real del aparato.`,
    );
  }

  if (Object.keys(request.filters).length > 0 || request.ageRange !== null) {
    notes.push(
      "Al filtrar quedan fuera los estudiantes a los que les falta ese dato en su ficha.",
    );
  }

  const warnings: string[] = [];
  const small = series.filter((item) => item.lowN && item.n > 0);

  if (small.length > 0) {
    warnings.push(
      `Pocos estudiantes (menos de ${LOW_N}) en: ${small
        .map((item) => `${item.label} (${item.n})`)
        .join(", ")}. No saques conclusiones con tan pocos datos.`,
    );
  }

  const hasData = series.some((item) => item.ns.some((n) => n > 0));

  if (!hasData) {
    warnings.push("No hay datos para mostrar con estos filtros.");
  }

  if (byStudent) {
    const empty = series.filter((item) => item.n === 0);

    if (hasData && empty.length > 0) {
      warnings.push(
        `Sin datos para: ${empty.map((item) => item.label).join(", ")}.`,
      );
    }
  }

  // El grupo "Sin dato" existe solo si hay estudiantes sin esa caracteristica.
  if (series.some((item) => item.key === NO_DATA_KEY)) {
    warnings.push(
      "«Sin dato» son estudiantes a los que les falta esa característica en su ficha.",
    );
  }

  return {
    chart: def.id,
    title: def.title,
    kind: def.kind,
    ...built,
    series,
    notes,
    warnings,
    generatedAt: now.toISOString(),
  };
}
