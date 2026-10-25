import { isColorSequenceResultPassed } from "../gameAttempts";
import {
  AS_OPTION,
  COMPOSITION_VIEWS,
  LEVEL_BAND_OPTION,
  asOf,
  compositionSeries,
  contextNotes,
  countLabel,
  gameUnits,
  groupUnits,
  inLevelBand,
  levelBandNote,
  metricPerLevel,
  numberMetric,
  periodNote,
  seriesOf,
  totalStudents,
  unitLabelOf,
  unitRut,
  type ChartDef,
  type Unit,
} from "./engine";
import { median, percentOf } from "./numbers";
import type { ResultRow } from "./types";

const GAME = "color-sequence" as const;

const maxPassedLevel = (unit: Unit) =>
  unit.results
    .filter((r) => isColorSequenceResultPassed(r))
    .reduce((max, r) => Math.max(max, r.index), 0);

/** Los resultados de un nivel agrupados por partida: lo que paso en cada nivel jugado. */
export function levelPlays(unit: Unit): { level: number; results: ResultRow[] }[] {
  const plays: { level: number; results: ResultRow[] }[] = [];

  for (const attempt of unit.attempts) {
    const byLevel = new Map<number, ResultRow[]>();

    for (const result of unit.results) {
      if (result.attemptId !== attempt.attemptId) continue;

      const list = byLevel.get(result.index) ?? [];

      list.push(result);
      byLevel.set(result.index, list);
    }

    for (const [level, results] of byLevel) plays.push({ level, results });
  }

  return plays;
}

const EXPLORATORY_NOTE =
  "Indicador exploratorio: describe cómo juegan, pero no basta para evaluar a nadie ni para sacar conclusiones por sí solo.";

// ------------------------------------------------------------------- S1

const csReach: ChartDef = {
  id: "cs-reach",
  game: GAME,
  title: "Estudiantes que superaron cada nivel",
  blurb:
    "Cuántos estudiantes lograron superar cada nivel. Como para llegar a un nivel hay que haber superado los anteriores, la curva solo baja: muestra dónde se va quedando el grupo.",
  views: ["lines", "bars"],
  usesPartida: true,
  supportsDevice: true,
  options: [AS_OPTION],
  build: (ctx) => {
    const units = gameUnits(ctx, GAME);
    const grouped = groupUnits(ctx, units);
    const top = units.reduce((max, unit) => Math.max(max, maxPassedLevel(unit)), 0);
    const levels = Array.from({ length: top }, (_, i) => i + 1);
    const mode = asOf(ctx);
    const label = unitLabelOf(ctx);

    return {
      xLabel: "Nivel",
      yLabel: mode === "percent" ? `% de ${label} del grupo` : countLabel(label),
      unit: mode === "percent" ? "percent" : "students",
      unitLabel: label,
      categories: levels.map(String),
      series: seriesOf(grouped, unitRut, levels.length, (group, i) => {
        const count = group.filter((unit) => maxPassedLevel(unit) >= (levels[i] as number)).length;

        return {
          value: mode === "percent" ? percentOf(count, group.length) : count,
          n: group.length,
          part: count,
          total: group.length,
        };
      }),
      partLabel: "que superaron el nivel",
      totalLabel: "del grupo",
      notes: [
        ...contextNotes(ctx),
        "Cuenta a quienes superaron ese nivel; el porcentaje es sobre todos los que jugaron.",
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
  },
};

// ------------------------------------------------------------------- S3

const BANDS = [
  { label: "Hasta el nivel 5", test: (level: number) => level <= 5 },
  { label: "Niveles 6 a 9", test: (level: number) => level >= 6 && level <= 9 },
  { label: "Niveles 10 a 12", test: (level: number) => level >= 10 && level <= 12 },
  { label: "Nivel 13 o más", test: (level: number) => level >= 13 },
];

const csBands: ChartDef = {
  id: "cs-bands",
  game: GAME,
  title: "Tramos de nivel máximo",
  blurb:
    "Reparte a los estudiantes según el tramo del nivel más alto que superaron: hasta el 5, del 6 al 9, del 10 al 12 y del 13 en adelante. Sirve para ver de un vistazo qué parte del grupo llega lejos y qué parte se queda al comienzo.",
  views: COMPOSITION_VIEWS,
  usesPartida: true,
  supportsDevice: true,
  options: [AS_OPTION],
  build: (ctx) => {
    const units = gameUnits(ctx, GAME);
    const grouped = groupUnits(ctx, units);
    const mode = asOf(ctx);
    const label = unitLabelOf(ctx);

    return {
      xLabel: "Tramo de nivel máximo superado",
      yLabel: mode === "percent" ? `% de ${label}` : countLabel(label),
      unit: mode === "percent" ? "percent" : "students",
      unitLabel: label,
      categories: BANDS.map((band) => band.label),
      series: compositionSeries(
        grouped,
        unitRut,
        BANDS.length,
        (items) => BANDS.map((band) => items.filter((unit) => band.test(maxPassedLevel(unit))).length),
        mode,
      ),
      notes: [
        ...contextNotes(ctx),
        "Quien no superó ningún nivel queda en «Hasta el nivel 5». Desde el nivel 10 se desbloquea Mini casos (junto con Conexión de nodos).",
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
  },
};

// ------------------------------------------------------------------- S4

const csImprovement: ChartDef = {
  id: "cs-improvement",
  game: GAME,
  title: "Mejora entre partidas",
  blurb:
    "Si juegan más veces, ¿llegan más lejos? Puedes ver el nivel máximo típico en cada número de partida, o cuántos estudiantes mejoraron, quedaron igual o empeoraron entre su primera y su última partida.",
  views: (options) => (options.measure === "change" ? COMPOSITION_VIEWS : ["lines", "bars"]),
  usesPartida: false,
  usesPeriod: true,
  supportsDevice: true,
  options: [
    {
      id: "measure",
      label: "Ver",
      default: "curve",
      choices: [
        { value: "curve", label: "Nivel máximo en cada número de partida" },
        { value: "change", label: "Cambio entre la primera y la última partida" },
      ],
    },
  ],
  build: (ctx) => {
    // Siempre una partida a la vez: aqui lo que importa es el orden de las partidas.
    const perAttempt = gameUnits(
      { ...ctx, request: { ...ctx.request, partida: null, countBy: "attempts" } },
      GAME,
    );

    if (ctx.options.measure === "change") {
      const byStudent = new Map<string, Unit[]>();

      for (const unit of perAttempt) {
        const list = byStudent.get(unit.attempt.studentRut) ?? [];

        list.push(unit);
        byStudent.set(unit.attempt.studentRut, list);
      }

      const items = [...byStudent.values()]
        .filter((list) => list.length >= 2)
        .map((list) => {
          const ordered = [...list].sort((a, b) => a.attempt.attemptNumber - b.attempt.attemptNumber);
          const first = ordered[0] as Unit;
          const last = ordered[ordered.length - 1] as Unit;
          const delta = maxPassedLevel(last) - maxPassedLevel(first);

          return { unit: last, delta };
        });

      const grouped = groupUnits(
        ctx,
        items.map((item) => item.unit),
      );
      const deltaOf = new Map(items.map((item) => [item.unit, item.delta]));
      const mode = asOf(ctx);

      return {
        xLabel: "Cambio de nivel máximo",
        yLabel: mode === "percent" ? "% de estudiantes" : "Estudiantes",
        unit: mode === "percent" ? "percent" : "students",
        unitLabel: "estudiantes",
        categories: ["Mejoró", "Quedó igual", "Empeoró"],
        series: compositionSeries(
          grouped,
          unitRut,
          3,
          (units) => {
            const deltas = units.map((unit) => deltaOf.get(unit) as number);

            return [
              deltas.filter((d) => d > 0).length,
              deltas.filter((d) => d === 0).length,
              deltas.filter((d) => d < 0).length,
            ];
          },
          mode,
        ),
        notes: [
          "Compara el nivel máximo superado en la primera y en la última partida de cada estudiante.",
          "Solo entran estudiantes con 2 o más partidas.",
          ...(periodNote(ctx) ? [periodNote(ctx) as string] : []),
        ],
        studentsTotal: totalStudents(grouped, unitRut),
      };
    }

    const grouped = groupUnits(ctx, perAttempt);
    const top = Math.min(
      perAttempt.reduce((max, unit) => Math.max(max, unit.attempt.attemptNumber), 0),
      20,
    );
    const numbers = Array.from({ length: top }, (_, i) => i + 1);

    return {
      xLabel: "Número de partida",
      yLabel: "Nivel máximo superado (mediana)",
      unit: "level",
      unitLabel: "estudiantes",
      categories: numbers.map(String),
      series: seriesOf(grouped, unitRut, numbers.length, (group, i) => {
        const levels = group
          .filter((unit) => unit.attempt.attemptNumber === numbers[i])
          .map((unit) => maxPassedLevel(unit));

        return { value: median(levels), n: levels.length };
      }),
      notes: [
        "Mediana del nivel más alto superado en cada partida, según el número de partida de cada estudiante.",
        "En cada número de partida solo cuentan quienes llegaron a jugarla.",
        ...(periodNote(ctx) ? [periodNote(ctx) as string] : []),
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
  },
};

// ------------------------------------------------------------------- S5

const TRIES = ["A la primera", "Al 2.º intento", "Al 3.er intento", "No lo superó"];

const csTries: ChartDef = {
  id: "cs-tries",
  game: GAME,
  title: "Intentos para superar un nivel",
  blurb:
    "Cada nivel da hasta 3 intentos. Aquí se ve en cuántos niveles jugados se superó a la primera, al segundo o al tercer intento, y en cuántos no se logró. Es una forma de ver cuánta insistencia necesitan.",
  views: COMPOSITION_VIEWS,
  usesPartida: true,
  supportsDevice: true,
  options: [AS_OPTION, LEVEL_BAND_OPTION],
  build: (ctx) => {
    const units = gameUnits(ctx, GAME);
    const grouped = groupUnits(ctx, units);
    const mode = asOf(ctx);
    const band = ctx.options.levels;

    const outcomes = (unit: Unit): number[] => {
      const counts = [0, 0, 0, 0];

      for (const play of levelPlays(unit)) {
        if (!inLevelBand(play.level, band)) continue;

        const passedTry = play.results
          .filter((r) => isColorSequenceResultPassed(r))
          .reduce<number | null>((min, r) => (min === null || r.tryNumber < min ? r.tryNumber : min), null);

        if (passedTry !== null) {
          counts[Math.min(passedTry, 3) - 1] = (counts[Math.min(passedTry, 3) - 1] ?? 0) + 1;
        } else if (play.results.some((r) => r.tryNumber >= 3)) {
          counts[3] = (counts[3] ?? 0) + 1;
        }
      }

      return counts;
    };

    return {
      xLabel: "Cuándo lo superó",
      yLabel: mode === "percent" ? "% de niveles jugados" : "Niveles jugados",
      unit: mode === "percent" ? "percent" : "students",
      unitLabel: "niveles jugados",
      categories: TRIES,
      series: compositionSeries(
        grouped,
        unitRut,
        TRIES.length,
        (items) => {
          const total = [0, 0, 0, 0];

          for (const unit of items) outcomes(unit).forEach((n, i) => (total[i] = (total[i] ?? 0) + n));

          return total;
        },
        mode,
      ),
      notes: [
        ...contextNotes(ctx),
        ...(levelBandNote(ctx) ? [levelBandNote(ctx) as string] : []),
        "Se cuenta cada nivel que alguien jugó. «No lo superó» es agotar los 3 intentos; un nivel que quedó a medias no se cuenta.",
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
  },
};

// ------------------------------------------------------------ S6, S7 (errores)

function analysisNumber(result: ResultRow, name: string): number | null {
  return numberMetric(result, name);
}

const ERROR_KINDS = ["Intercambios (dos colores cambiados de lugar)", "Sustituciones (otro color en el lugar)"];

const csErrorType: ChartDef = {
  id: "cs-error-type",
  game: GAME,
  title: "Tipo de error",
  blurb:
    "Cuando se equivocan, ¿cambian dos colores de lugar (intercambio) o ponen un color que no correspondía (sustitución)? Ayuda a ver si el error viene del orden o de recordar los colores.",
  views: COMPOSITION_VIEWS,
  exploratory: true,
  usesPartida: true,
  supportsDevice: true,
  options: [AS_OPTION, LEVEL_BAND_OPTION],
  build: (ctx) => {
    const units = gameUnits(ctx, GAME);
    const grouped = groupUnits(ctx, units);
    const mode = asOf(ctx);
    const band = ctx.options.levels;

    return {
      xLabel: "Tipo de error",
      yLabel: mode === "percent" ? "% de errores" : "Errores",
      unit: mode === "percent" ? "percent" : "students",
      unitLabel: "errores",
      categories: ERROR_KINDS,
      series: compositionSeries(
        grouped,
        unitRut,
        2,
        (items) => {
          let swaps = 0;
          let substitutions = 0;

          for (const unit of items) {
            for (const r of unit.results) {
              if (!inLevelBand(r.index, band)) continue;

              swaps += analysisNumber(r, "swapErrors") ?? 0;
              substitutions += analysisNumber(r, "substitutionErrors") ?? 0;
            }
          }

          return [swaps, substitutions];
        },
        mode,
      ),
      notes: [
        ...contextNotes(ctx),
        ...(levelBandNote(ctx) ? [levelBandNote(ctx) as string] : []),
        "Se cuentan los errores de todos los intentos. Solo hay datos de los niveles registrados con el detalle de cada toque.",
        EXPLORATORY_NOTE,
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
  },
};

const FIRST_ERROR = ["Al comienzo de la secuencia", "En la parte central", "Al final de la secuencia"];

const csFirstError: ChartDef = {
  id: "cs-first-error",
  game: GAME,
  title: "Dónde fallan primero",
  blurb:
    "En las respuestas con error del primer intento, en qué parte de la secuencia ocurrió el primer fallo: al comienzo, en la parte central o al final. Por ejemplo, en una secuencia de 9 colores el comienzo son los colores 1 a 3, la parte central del 4 al 6 y el final del 7 al 9. Un fallo temprano suele hablar de no haber retenido el comienzo; uno tardío, de perder el hilo.",
  views: COMPOSITION_VIEWS,
  exploratory: true,
  usesPartida: true,
  supportsDevice: true,
  options: [AS_OPTION, LEVEL_BAND_OPTION],
  build: (ctx) => {
    const units = gameUnits(ctx, GAME);
    const grouped = groupUnits(ctx, units);
    const mode = asOf(ctx);
    const band = ctx.options.levels;

    return {
      xLabel: "Dónde fue el primer error",
      yLabel: mode === "percent" ? "% de respuestas con error" : "Respuestas con error",
      unit: mode === "percent" ? "percent" : "students",
      unitLabel: "respuestas con error",
      categories: FIRST_ERROR,
      series: compositionSeries(
        grouped,
        unitRut,
        3,
        (items) => {
          const parts = [0, 0, 0];

          for (const unit of items) {
            for (const r of unit.results) {
              if (r.tryNumber !== 1 || !inLevelBand(r.index, band)) continue;

              const position = analysisNumber(r, "firstErrorPosition");
              const length = analysisNumber(r, "sequenceLength");

              if (position === null || length === null || length <= 0) continue;

              const relative = (position - 1) / length;
              const slot = relative < 1 / 3 ? 0 : relative < 2 / 3 ? 1 : 2;

              parts[slot] = (parts[slot] ?? 0) + 1;
            }
          }

          return parts;
        },
        mode,
      ),
      notes: [
        ...contextNotes(ctx),
        ...(levelBandNote(ctx) ? [levelBandNote(ctx) as string] : []),
        "Solo el primer intento de cada nivel y solo las respuestas con algún error.",
        EXPLORATORY_NOTE,
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
  },
};

// ------------------------------------------------------------------- S8

const csPace: ChartDef = {
  id: "cs-pace",
  game: GAME,
  title: "Ritmo de respuesta",
  blurb:
    "Cómo responden cada nivel: cuánto tardan en dar el primer toque, el tiempo típico entre un toque y el siguiente, o la pausa más larga. Muestra si dudan al empezar o a mitad de la secuencia.",
  views: ["lines", "bars"],
  exploratory: true,
  usesPartida: true,
  supportsDevice: true,
  options: [
    {
      id: "measure",
      label: "Medir",
      default: "between",
      choices: [
        { value: "between", label: "Tiempo entre toques (promedio)" },
        { value: "first", label: "Tiempo hasta el primer toque" },
        { value: "pause", label: "Pausa más larga" },
      ],
    },
  ],
  build: (ctx) => {
    const metric =
      ctx.options.measure === "first"
        ? "firstTapMs"
        : ctx.options.measure === "pause"
          ? "maxPauseMs"
          : "meanInterTapMs";
    const label =
      ctx.options.measure === "first"
        ? "Segundos hasta el primer toque (mediana)"
        : ctx.options.measure === "pause"
          ? "Segundos de la pausa más larga (mediana)"
          : "Segundos entre toques (mediana)";

    return metricPerLevel(
      ctx,
      GAME,
      (r) => {
        const value = analysisNumber(r, metric);

        return value === null ? null : value / 1000;
      },
      label,
      "seconds",
      [
        "Solo el primer intento de cada nivel; es el tiempo de la respuesta, sin contar cuándo se mostró la secuencia.",
        "Solo hay datos de los niveles registrados con el detalle de cada toque.",
        EXPLORATORY_NOTE,
      ],
    );
  },
};

export function chartsSeriation(
  maxLevel: ChartDef,
  passRate: ChartDef,
  time: ChartDef,
): ChartDef[] {
  return [
    maxLevel,
    csReach,
    csBands,
    passRate,
    csTries,
    time,
    csPace,
    csImprovement,
    csErrorType,
    csFirstError,
  ];
}
