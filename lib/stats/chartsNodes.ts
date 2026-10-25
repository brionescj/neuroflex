import { isLevelResultPassed } from "../gameAttempts";
import { nodeAllowedErrors, nodeErrorsOf } from "../nodeRules";
import { levelPlays } from "./chartsSeriation";
import {
  AS_OPTION,
  COMPOSITION_VIEWS,
  LEVEL_BAND_OPTION,
  asOf,
  compositionSeries,
  contextNotes,
  countLabel,
  distribution,
  gameUnits,
  groupUnits,
  inLevelBand,
  levelBandNote,
  levelsRange,
  metricPerLevel,
  numberMetric,
  periodNote,
  seriesOf,
  timePerLevel,
  totalStudents,
  unitLabelOf,
  unitRut,
  type ChartDef,
  type Unit,
} from "./engine";
import { median, percentOf } from "./numbers";
import type { ResultRow } from "./types";

const GAME = "node-connection" as const;

const EXPLORATORY_NOTE =
  "Indicador exploratorio: describe cómo juegan, pero no basta para evaluar a nadie ni para sacar conclusiones por sí solo.";

const NODE_RULE_NOTE =
  "Un nivel se supera resolviendo el tablero sin agotar los errores permitidos: cada choque cuenta como un error y cada «Rehacer tablero», como dos.";

const maxPassedLevel = (unit: Unit) =>
  unit.results
    .filter((r) => isLevelResultPassed(r))
    .reduce((max, r) => Math.max(max, r.index), 0);

/** Errores del intento: el guardado, o los que salen de sus choques y reinicios. null si no hay contadores. */
function errorsOfResult(result: ResultRow): number | null {
  const saved = numberMetric(result, "errors");

  if (saved !== null) return saved;

  const blocked = numberMetric(result, "blockedCount");

  if (blocked === null) return null;

  return nodeErrorsOf({ blockedCount: blocked, resetCount: numberMetric(result, "resetCount") ?? 0 });
}

function allowedOfResult(result: ResultRow): number | null {
  const saved = numberMetric(result, "errorsAllowed");

  if (saved !== null) return saved;

  const pairs = numberMetric(result, "pairCount");

  return pairs === null ? null : nodeAllowedErrors(result.index, pairs);
}

// ------------------------------------------------------------------ niveles

const ncLevels: ChartDef = {
  id: "nc-levels",
  game: GAME,
  title: "Nivel máximo superado",
  blurb:
    "Hasta qué nivel de Conexión de nodos llegó cada estudiante, es decir, el más alto que superó. Se muestra cuántos estudiantes tuvieron cada nivel como máximo.",
  views: ["bars", "lines"],
  usesPartida: true,
  supportsDevice: true,
  options: [AS_OPTION],
  build: (ctx) =>
    distribution(ctx, GAME, maxPassedLevel, 0, "Nivel máximo superado", [
      "El nivel 0 son los estudiantes que no superaron ningún nivel.",
      NODE_RULE_NOTE,
    ]),
};

const ncReach: ChartDef = {
  id: "nc-reach",
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
        NODE_RULE_NOTE,
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
  },
};

const ncPassRate: ChartDef = {
  id: "nc-pass-rate",
  game: GAME,
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
    const units = gameUnits(ctx, GAME);
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
          const counted = firstTry ? atLevel.filter((r) => r.tryNumber === 1) : atLevel;

          if (counted.length === 0) continue;

          played += 1;
          if (counted.some((r) => isLevelResultPassed(r))) passed += 1;
        }

        return { value: percentOf(passed, played), n: played, part: passed, total: played };
      }),
      partLabel: "que lo superaron",
      totalLabel: "que jugaron el nivel",
      notes: [
        ...contextNotes(ctx),
        "En cada nivel solo cuentan quienes lo jugaron; por eso los niveles altos tienen pocos datos.",
        NODE_RULE_NOTE,
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
  },
};

const ncTime: ChartDef = {
  id: "nc-time",
  game: GAME,
  title: "Tiempo por nivel",
  blurb:
    "Tiempo mediano que tardan en resolver cada nivel de Conexión de nodos, contando solo el primer intento cuando se superó. La mediana es el valor del medio: unos pocos tiempos muy largos no la distorsionan.",
  views: ["lines", "bars"],
  usesPartida: true,
  supportsDevice: true,
  options: [],
  build: (ctx) =>
    timePerLevel(
      ctx,
      GAME,
      true,
      "Solo se mide el primer intento de cada nivel y solo si lo superó: un intento perdido termina antes de resolver el tablero, así que su tiempo no es el de resolverlo. Quien necesitó reintentos no aporta tiempo a ese nivel.",
    ),
};

// ------------------------------------------------------------------ intentos

const TRIES = ["A la primera", "Al 2.º intento", "Al 3.er intento", "No lo superó"];

const ncTries: ChartDef = {
  id: "nc-tries",
  game: GAME,
  title: "Intentos para superar un nivel",
  blurb:
    "Cada nivel da hasta 3 intentos con el mismo tablero. Aquí se ve en cuántos niveles jugados se superó a la primera, al segundo o al tercer intento, y en cuántos no se logró. Es una forma de ver cuánta insistencia necesitan.",
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
          .filter((r) => isLevelResultPassed(r))
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
        NODE_RULE_NOTE,
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
  },
};

// ------------------------------------------------------------------- errores

const ncErrors: ChartDef = {
  id: "nc-errors",
  game: GAME,
  title: "Errores por nivel",
  blurb:
    "Cuántos errores cometen en cada nivel: choques con otra línea o con un nodo, y los «Rehacer tablero». También se puede ver qué parte del margen de errores permitido usan. Muestra en qué niveles el tablero los obliga a rectificar más.",
  views: ["lines", "bars"],
  usesPartida: true,
  supportsDevice: true,
  options: [
    {
      id: "measure",
      label: "Medir",
      default: "errors",
      choices: [
        { value: "errors", label: "Errores (choques + rehacer tablero ×2)" },
        { value: "blocked", label: "Choques con otra línea o nodo" },
        { value: "margin", label: "Margen de errores usado (%)" },
      ],
    },
  ],
  build: (ctx) => {
    const measure = ctx.options.measure;

    if (measure === "margin") {
      return metricPerLevel(
        ctx,
        GAME,
        (r) => {
          const errors = errorsOfResult(r);
          const allowed = allowedOfResult(r);

          return errors === null || allowed === null || allowed <= 0 ? null : (errors / allowed) * 100;
        },
        "% del margen usado (mediana)",
        "percent",
        [
          "Errores cometidos dividido por los permitidos en ese nivel. Pasar de 100 % es perder el intento: un intento perdido queda justo sobre 100 %.",
          "Solo el primer intento de cada nivel. Solo niveles registrados con el detalle de choques y reinicios.",
          NODE_RULE_NOTE,
        ],
      );
    }

    return metricPerLevel(
      ctx,
      GAME,
      measure === "blocked" ? (r) => numberMetric(r, "blockedCount") : errorsOfResult,
      measure === "blocked" ? "Choques (mediana)" : "Errores (mediana)",
      "count",
      [
        measure === "blocked"
          ? "Un choque es intentar pasar la línea por una celda ocupada por otro trazo o nodo."
          : "Errores = choques + 2 por cada «Rehacer tablero».",
        "Solo el primer intento de cada nivel. Solo niveles registrados con el detalle de choques y reinicios.",
        "Los niveles altos tienen tableros más grandes y más pares, así que es esperable que acumulen más errores.",
      ],
    );
  },
};

// ------------------------------------------------------------- correcciones

const CORRECTION_MEASURES: Record<string, { metric: string; label: string; note: string }> = {
  undo: {
    metric: "undoCount",
    label: "Veces que usó Deshacer (mediana)",
    note: "«Deshacer» retrocede solo el último movimiento. No cuenta como error.",
  },
  reset: {
    metric: "resetCount",
    label: "Veces que usó Rehacer tablero (mediana)",
    note: "«Rehacer tablero» borra todo y empieza de cero. Cuenta como dos errores.",
  },
  routeRestarts: {
    metric: "routeRestarts",
    label: "Veces que rehízo una ruta (mediana)",
    note: "Rehacer una ruta es volver a empezar desde un nodo o una celda un trazo ya dibujado. No cuenta como error.",
  },
  backtrack: {
    metric: "backtrackGestures",
    label: "Gestos en que retrocedió (mediana)",
    note: "Un gesto en que retrocedió es apoyar el dedo y volver sobre su propio trazo al menos una celda. No cuenta como error.",
  },
  open: {
    metric: "strokesLeftOpen",
    label: "Trazos soltados sin conectar (mediana)",
    note: "Un trazo soltado sin conectar es levantar el dedo antes de llegar al nodo pareja.",
  },
  erased: {
    metric: "cellsErased",
    label: "Celdas borradas (mediana)",
    note: "Celdas dibujadas que después se borraron, por cualquier motivo.",
  },
};

const ncCorrections: ChartDef = {
  id: "nc-corrections",
  game: GAME,
  title: "Correcciones por nivel",
  blurb:
    "Cómo corrigen mientras resuelven cada nivel: cuántas veces usan Deshacer, Rehacer tablero, rehacen una ruta, retroceden sobre su trazo, sueltan un trazo sin conectar o cuántas celdas borran. Corregir con calma es parte de planificar; muchas correcciones seguidas pueden indicar que prueban sin anticipar el camino.",
  views: ["lines", "bars"],
  exploratory: true,
  usesPartida: true,
  supportsDevice: true,
  options: [
    {
      id: "measure",
      label: "Medir",
      default: "undo",
      choices: [
        { value: "undo", label: "Deshacer" },
        { value: "reset", label: "Rehacer tablero" },
        { value: "routeRestarts", label: "Rehacer una ruta" },
        { value: "backtrack", label: "Retroceder sobre el trazo" },
        { value: "open", label: "Trazos soltados sin conectar" },
        { value: "erased", label: "Celdas borradas" },
      ],
    },
  ],
  build: (ctx) => {
    const chosen = CORRECTION_MEASURES[ctx.options.measure ?? "undo"] ?? (CORRECTION_MEASURES.undo as (typeof CORRECTION_MEASURES)[string]);

    return metricPerLevel(
      ctx,
      GAME,
      (r) => numberMetric(r, chosen.metric),
      chosen.label,
      "count",
      [
        chosen.note,
        "Solo el primer intento de cada nivel. Solo niveles registrados con ese detalle.",
        EXPLORATORY_NOTE,
      ],
    );
  },
};

const MIX = ["Deshacer", "Rehacer tablero", "Rehacer una ruta", "Retroceder sobre el trazo"];
const MIX_METRICS = ["undoCount", "resetCount", "routeRestarts", "backtrackGestures"];

const ncCorrectionMix: ChartDef = {
  id: "nc-correction-mix",
  game: GAME,
  title: "Cómo corrigen",
  blurb:
    "De todas las correcciones que hacen, qué parte es Deshacer, Rehacer tablero, rehacer una ruta o retroceder sobre su trazo. Distingue a quien ajusta de a poco de quien prefiere empezar de cero.",
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
    const label = unitLabelOf(ctx);

    return {
      xLabel: "Tipo de corrección",
      yLabel: mode === "percent" ? "% de correcciones" : "Correcciones",
      unit: mode === "percent" ? "percent" : "students",
      unitLabel: "correcciones",
      categories: MIX,
      series: compositionSeries(
        grouped,
        unitRut,
        MIX.length,
        (items) => {
          const total = MIX.map(() => 0);

          for (const unit of items) {
            for (const r of unit.results) {
              if (!inLevelBand(r.index, band)) continue;

              const values = MIX_METRICS.map((metric) => numberMetric(r, metric));

              // Solo se suman los niveles que traen los cuatro contadores: si faltara uno, el reparto saldria torcido.
              if (values.some((v) => v === null)) continue;

              values.forEach((v, i) => (total[i] = (total[i] ?? 0) + (v as number)));
            }
          }

          return total;
        },
        mode,
      ),
      notes: [
        ...contextNotes(ctx),
        ...(levelBandNote(ctx) ? [levelBandNote(ctx) as string] : []),
        `Se suman todos los intentos de ${label === "partidas" ? "las partidas" : "los estudiantes"} del grupo. Solo entran los niveles registrados con el detalle de cada corrección.`,
        EXPLORATORY_NOTE,
      ],
      studentsTotal: totalStudents(grouped, unitRut),
    };
  },
};

// ------------------------------------------------------------------ ritmo

const ncPace: ChartDef = {
  id: "nc-pace",
  game: GAME,
  title: "Planificación y pausas",
  blurb:
    "Cuánto tardan en hacer el primer trazo de cada nivel (el tiempo que dedican a mirar el tablero antes de empezar), cuál fue su pausa más larga o cuántas pausas largas hicieron. Muestra si planifican antes de actuar o si dudan a mitad del nivel.",
  views: ["lines", "bars"],
  exploratory: true,
  usesPartida: true,
  supportsDevice: true,
  options: [
    {
      id: "measure",
      label: "Medir",
      default: "first",
      choices: [
        { value: "first", label: "Tiempo hasta el primer trazo" },
        { value: "pause", label: "Pausa más larga" },
        { value: "count", label: "Cantidad de pausas largas" },
      ],
    },
  ],
  build: (ctx) => {
    const measure = ctx.options.measure;

    if (measure === "count") {
      return metricPerLevel(
        ctx,
        GAME,
        (r) => numberMetric(r, "longPauses"),
        "Pausas largas (mediana)",
        "count",
        [
          "Una pausa larga es un tiempo sin tocar nada de 5 segundos o más entre dos acciones del nivel.",
          "Solo el primer intento de cada nivel. Solo niveles registrados con el detalle de cada acción.",
          EXPLORATORY_NOTE,
        ],
      );
    }

    const metric = measure === "pause" ? "maxPauseMs" : "firstStrokeMs";

    return metricPerLevel(
      ctx,
      GAME,
      (r) => {
        const value = numberMetric(r, metric);

        return value === null ? null : value / 1000;
      },
      measure === "pause" ? "Segundos de la pausa más larga (mediana)" : "Segundos hasta el primer trazo (mediana)",
      "seconds",
      [
        measure === "pause"
          ? "La pausa más larga es el mayor tiempo seguido sin tocar nada entre dos acciones del nivel."
          : "Es el tiempo activo desde que aparece el tablero hasta que apoya el dedo por primera vez.",
        "Solo el primer intento de cada nivel. Solo niveles registrados con el detalle de cada acción.",
        "Los tableros más grandes piden más tiempo para mirarlos, así que el tiempo tiende a subir con el nivel.",
        EXPLORATORY_NOTE,
      ],
    );
  },
};

// ------------------------------------------------------------------ mejora

const ncImprovement: ChartDef = {
  id: "nc-improvement",
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
    const perAttempt = gameUnits({ ...ctx, request: { ...ctx.request, partida: null, countBy: "attempts" } }, GAME);

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

          return { unit: last, delta: maxPassedLevel(last) - maxPassedLevel(first) };
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

export function chartsNodes(): ChartDef[] {
  return [
    ncLevels,
    ncPassRate,
    ncTime,
    ncReach,
    ncTries,
    ncErrors,
    ncCorrections,
    ncCorrectionMix,
    ncPace,
    ncImprovement,
  ];
}
