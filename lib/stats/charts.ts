import { isColorSequenceResultPassed } from "../gameAttempts.js";
import { deductionOf } from "./deductions.js";
import { chartsGeneral } from "./chartsGeneral.js";
import { chartsNodes } from "./chartsNodes.js";
import { mcOptions } from "./chartsMiniCases.js";
import { chartsSeriation } from "./chartsSeriation.js";
import {
  AS_OPTION,
  BUCKET_OPTION,
  GAME_OPTION,
  bucketOf,
  contextNotes,
  distribution,
  gameNote,
  groupUnits,
  isAbandoned,
  levelsRange,
  gameUnits,
  numberMetric,
  perCase,
  secondsOf,
  seriesOf,
  timeBase,
  timePerLevel,
  totalStudents,
  unitLabelOf,
  unitRut,
  type ChartDef,
  type Ctx,
} from "./engine.js";
import {
  DIMENSION_LABELS,
  FILTER_DIMENSIONS,
  NO_DATA_KEY,
  NO_DATA_LABEL,
  TABLET_MIN_SHORT_SIDE,
  ageOf,
  dimensionValue,
} from "./dimensions.js";
import { mean, median, percentOf } from "./numbers.js";
import {
  groupItems,
  indexStudents,
  passesAge,
  passesFilters,
  type GroupItem,
} from "./pipeline.js";
import { bucketKey, bucketLabel, bucketRange, MAX_BUCKETS } from "./time.js";
import {
  GAME_IDS,
  GAME_LABELS,
  type ChartRequest,
  type ChartResult,
  type DimensionId,
  type GameId,
  type StatsData,
  type StudentRow,
} from "./types.js";

export type { ChartDef } from "./engine.js";

// --------------------------------------------------------------------- juegos

const csMaxLevel: ChartDef = {
  id: "cs-max-level",
  game: "color-sequence",
  title: "Nivel máximo superado",
  blurb:
    "En cada nivel hay que repetir una secuencia de colores más larga que en el anterior. Aquí se ve hasta qué nivel llegó cada estudiante, es decir, el más alto que superó.",
  views: ["bars", "lines"],
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
  views: ["lines", "bars"],
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

        return { value: percentOf(passed, played), n: played, part: passed, total: played };
      }),
      partLabel: "que lo superaron",
      totalLabel: "que jugaron el nivel",
      notes: [
        ...contextNotes(ctx),
        "En cada nivel solo cuentan quienes lo jugaron; por eso los niveles altos tienen pocos datos.",
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
  },
};

const csTime: ChartDef = {
  id: "cs-time",
  game: "color-sequence",
  title: "Tiempo por nivel",
  blurb:
    "Tiempo mediano que tardan en responder cada nivel, contando solo el primer intento. La mediana es el valor del medio: unos pocos tiempos muy largos no la distorsionan.",
  views: ["lines", "bars"],
  usesPartida: true,
  supportsDevice: true,
  options: [],
  build: (ctx) =>
    timePerLevel(ctx, "color-sequence", true, "Solo se mide el primer intento de cada nivel."),
};

const mcSteps: ChartDef = {
  id: "mc-steps",
  game: "mini-cases",
  title: "Resultado por caso",
  blurb:
    "En cada mini caso hay que ordenar 4 pasos. Se puede ver el promedio de pasos puestos en su lugar correcto (de 0 a 4) o el porcentaje de estudiantes que ordenó el caso completo sin errores.",
  views: ["bars", "lines"],
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
  views: ["bars", "lines"],
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
  views: ["bars"],
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
            part: count,
            total: group.length,
          };
        },
      ),
      partLabel: finishedOnly ? "que terminaron el juego" : "que comenzaron el juego",
      totalLabel: "habilitados",
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

const activity: ChartDef = {
  id: "activity",
  game: "general",
  title: "Actividad en el tiempo",
  blurb:
    "Cuántos estudiantes distintos jugaron al menos un nivel o caso en cada día, semana o mes. Sirve para ver el ritmo de uso de la plataforma.",
  views: ["lines", "bars"],
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
        `Se muestran como máximo los últimos ${MAX_BUCKETS[bucket]} períodos.`,
      ],
      studentsTotal: totalStudents(grouped, (attempt) => attempt.studentRut),
    };
  },
};

const abandonment: ChartDef = {
  id: "abandonment",
  game: "general",
  title: "Partidas abandonadas",
  blurb:
    "Partidas que quedaron a medias: sin terminar y sin actividad hace más de 4 horas. Cada una se ubica en el período de su última actividad. Si el estudiante retoma la partida, deja de contarse.",
  views: ["lines", "bars"],
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
  ...chartsGeneral(participation, activity, abandonment),
  ...chartsSeriation(csMaxLevel, csPassRate, csTime),
  ...chartsNodes(),
  mcSteps,
  mcTime,
  mcOptions,
];

export function findChart(id: string): ChartDef | undefined {
  return CHARTS.find((chart) => chart.id === id);
}

/**
 * Cuantos estudiantes habilitados quedan fuera por no tener en su ficha el dato
 * por el que se filtro. Se mira la ficha actual: la edad sale de la fecha de
 * nacimiento. El dispositivo no es un dato de la ficha, asi que no cuenta.
 */
export function missingDataNote(
  request: Pick<ChartRequest, "filters" | "ageRange">,
  students: StatsData["students"],
  now: Date,
): string {
  const parts: string[] = [];

  for (const dimension of FILTER_DIMENSIONS) {
    if (dimension === "device" || !request.filters[dimension]?.length) continue;

    // Filtrar por tramo de edad usa la edad, que sale de la fecha de nacimiento.
    const label = dimension === "ageBand" ? "fecha de nacimiento" : DIMENSION_LABELS[dimension].toLowerCase();
    const missing = students.filter(
      (student) => dimensionValue(dimension, student, null, now) === null,
    ).length;

    if (missing > 0) parts.push(`${missing} sin ${label}`);
  }

  if (request.ageRange !== null) {
    const missing = students.filter((student) => ageOf(student, null, now) === null).length;

    if (missing > 0) parts.push(`${missing} sin fecha de nacimiento`);
  }

  return parts.length === 0
    ? "Ningún estudiante habilitado quedó fuera por datos que falten en su ficha."
    : `Al filtrar quedan fuera estudiantes habilitados a los que les falta el dato en su ficha: ${[...new Set(parts)].join(", ")}.`;
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

  const { series } = built;

  const notes = [...built.notes, "Solo se cuentan estudiantes habilitados."];

  if (request.groupBy === "device" || request.filters.device) {
    notes.push(
      `Dispositivo estimado con el tipo de pantalla y el tamaño de la ventana en la primera sesión de cada partida: Celular es táctil con el lado corto de la ventana menor a ${TABLET_MIN_SHORT_SIDE} px; Tableta es táctil de ${TABLET_MIN_SHORT_SIDE} px o más (una tableta no se cuenta como celular); Computador es con mouse, o un notebook táctil de pantalla ancha. Es una estimación, no el modelo real del aparato.`,
    );

    if (request.groupBy === "device" && request.countBy === "students") {
      notes.push(
        "Un estudiante que jugó en más de un tipo de aparato aparece en cada uno, con las partidas que jugó ahí.",
      );
    }
  }

  if (Object.keys(request.filters).length > 0 || request.ageRange !== null) {
    notes.push(missingDataNote(request, enabledStudents, now));
  }

  const warnings: string[] = [];
  const hasData = series.some((item) => item.ns.some((n) => n > 0));

  // Las listas y los resumenes no tienen series: su tabla (o sus tarjetas) es el dato.
  if (!hasData && !built.table && !built.cards) {
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
  if (series.some((item) => item.key === NO_DATA_KEY || (request.alsoBy.length > 0 && item.label.includes(NO_DATA_LABEL)))) {
    warnings.push(
      "«Sin dato» son estudiantes a los que les falta esa característica en su ficha.",
    );
  }

  return {
    chart: def.id,
    title: def.title,
    views: typeof def.views === "function" ? def.views(request.options) : def.views,
    exploratory: def.exploratory ?? false,
    ...(deductionOf(def.id, false) ? { deduction: deductionOf(def.id, false) } : {}),
    ...built,
    series,
    notes,
    warnings,
    generatedAt: now.toISOString(),
  };
}
