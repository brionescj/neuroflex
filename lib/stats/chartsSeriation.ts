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
  numberMetric,
  seriesOf,
  totalStudents,
  unitLabelOf,
  unitRut,
  type ChartDef,
  type Ctx,
  type Unit,
} from "./engine";
import { BASE_COLUMNS, baseCells } from "./chartsLists";
import { percentOf } from "./numbers";
import { studentName, type Grouped } from "./pipeline";
import type { ChartOptionDef, ChartTable, ResultRow, StudentRow } from "./types";

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

// ------------------------------------------------------------------- S5

const TRIES = ["A la primera", "Al 2.º intento", "Al 3.er intento", "No lo superó"];

const csTries: ChartDef = {
  id: "cs-tries",
  profileOnly: true,
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

/** En cuantas partes iguales se divide la secuencia para ubicar el primer error. */
const FIRST_ERROR_PARTS = 5;

const FIRST_ERROR = [
  "1.ª parte (inicio)",
  "2.ª parte",
  "3.ª parte (centro)",
  "4.ª parte",
  "5.ª parte (final)",
];

/** La parte de la secuencia (0 a 4) donde cae el primer error, o null si falta el dato. */
function firstErrorPart(r: ResultRow): number | null {
  const position = analysisNumber(r, "firstErrorPosition");
  const length = analysisNumber(r, "sequenceLength");

  if (position === null || length === null || length <= 0) return null;

  // El ultimo color siempre cae en la ultima parte, sea cual sea el largo de la secuencia.
  return Math.max(0, Math.min(FIRST_ERROR_PARTS - 1, Math.ceil((position / length) * FIRST_ERROR_PARTS) - 1));
}

const FIRST_ERROR_SHOW: ChartOptionDef = {
  id: "show",
  label: "Mostrar",
  default: "chart",
  choices: [
    { value: "chart", label: "Gráfico" },
    { value: "students", label: "Tabla: en qué parte falla cada estudiante" },
  ],
};

/**
 * La tabla de «Dónde fallan primero»: un estudiante por fila, con cuantas veces
 * fallo primero en cada parte de la secuencia y en cual falla mas. Solo salen
 * quienes tuvieron alguna respuesta con error en el primer intento.
 */
function firstErrorTable(
  ctx: Ctx,
  grouped: Grouped<Unit>,
  partsOf: (items: Unit[]) => number[],
): ChartTable {
  const manyGroups = grouped.specs.length > 1;
  const rows: { name: string; row: (string | number | null)[] }[] = [];

  for (const spec of grouped.specs) {
    const byRut = new Map<string, Unit[]>();

    for (const unit of grouped.byGroup.get(spec.key) ?? []) {
      const list = byRut.get(unitRut(unit)) ?? [];

      list.push(unit);
      byRut.set(unitRut(unit), list);
    }

    for (const [rut, items] of byRut) {
      const parts = partsOf(items);
      const total = parts.reduce((sum, n) => sum + n, 0);

      if (total === 0) continue;

      const top = Math.max(...parts);
      const where = FIRST_ERROR.filter((_, i) => parts[i] === top).join(" y ");
      const student: StudentRow | undefined = ctx.students.get(rut);

      rows.push({
        name: student ? `${student.paternalLastName} ${student.firstName}` : rut,
        row: [
          ...(student ? baseCells(student) : [studentName(undefined, rut), rut, "", ""]),
          ...(manyGroups ? [spec.label] : []),
          total,
          ...parts,
          where,
        ],
      });
    }
  }

  rows.sort((a, b) => a.name.localeCompare(b.name, "es"));

  return {
    columns: [
      ...BASE_COLUMNS,
      ...(manyGroups ? ["Grupo"] : []),
      "Respuestas con error",
      ...FIRST_ERROR,
      "Donde más falla primero",
    ],
    rows: rows.map((entry) => entry.row),
  };
}

const csFirstError: ChartDef = {
  id: "cs-first-error",
  game: GAME,
  title: "Dónde fallan primero",
  blurb:
    "En las respuestas con error del primer intento, en qué parte de la secuencia ocurrió el primer fallo. La secuencia se divide en 5 partes iguales: por ejemplo, en una de 10 colores la 1.ª parte son los colores 1 y 2, la 2.ª el 3 y 4, la 3.ª (centro) el 5 y 6, la 4.ª el 7 y 8 y la 5.ª (final) el 9 y 10. Un fallo temprano suele hablar de no haber retenido el comienzo; uno tardío, de perder el hilo. Con «Tabla» ves en qué parte falla cada estudiante.",
  views: (options) => (options.show === "students" ? [] : COMPOSITION_VIEWS),
  exploratory: true,
  usesPartida: true,
  supportsDevice: true,
  options: [AS_OPTION, LEVEL_BAND_OPTION, FIRST_ERROR_SHOW],
  build: (ctx) => {
    const units = gameUnits(ctx, GAME);
    const grouped = groupUnits(ctx, units);
    const mode = asOf(ctx);
    const band = ctx.options.levels;

    const partsOf = (items: Unit[]) => {
      const parts = new Array<number>(FIRST_ERROR_PARTS).fill(0);

      for (const unit of items) {
        for (const r of unit.results) {
          if (r.tryNumber !== 1 || !inLevelBand(r.index, band)) continue;

          const part = firstErrorPart(r);

          if (part !== null) parts[part] = (parts[part] ?? 0) + 1;
        }
      }

      return parts;
    };

    const table = ctx.options.show === "students" ? firstErrorTable(ctx, grouped, partsOf) : undefined;

    return {
      ...(table ? { table } : {}),
      xLabel: "Dónde fue el primer error",
      yLabel: mode === "percent" ? "% de respuestas con error" : "Respuestas con error",
      unit: mode === "percent" ? "percent" : "students",
      unitLabel: "respuestas con error",
      categories: FIRST_ERROR,
      series: compositionSeries(
        grouped,
        unitRut,
        FIRST_ERROR_PARTS,
        partsOf,
        mode,
      ),
      notes: [
        ...contextNotes(ctx),
        ...(levelBandNote(ctx) ? [levelBandNote(ctx) as string] : []),
        "Solo el primer intento de cada nivel y solo las respuestas con algún error.",
        "La secuencia se divide en 5 partes iguales según su largo en ese nivel.",
        ...(table
          ? [`${table.rows.length} estudiantes con al menos una respuesta con error. «Donde más falla primero» es la parte con más primeros errores; si hay empate salen las dos.`]
          : []),
        EXPLORATORY_NOTE,
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
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
    csErrorType,
    csFirstError,
  ];
}
