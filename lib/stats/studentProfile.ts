import { isColorSequenceResultPassed } from "../gameAttempts";
import { buildChart } from "./charts";
import { chileDate, fullName, miniCasesProgress, shiftText, universityText } from "./chartsLists";
import { median, round } from "./numbers";
import { parseChartRequest } from "./request";
import {
  GAME_LABELS,
  type AttemptRow,
  type ChartCards,
  type ChartId,
  type ChartResult,
  type GameId,
  type ResultRow,
  type StatsData,
  type StudentProfile,
  type StudentProfileChart,
  type StudentRow,
} from "./types";

/**
 * La ficha de desempeno de un estudiante: su resumen, su historial de partidas
 * y los mismos graficos del catalogo pedidos solo para el. Los calculos son los
 * de siempre (se pide cada grafico comparando «estudiantes especificos» con uno
 * solo): asi sus numeros coinciden con los de la pantalla de estadisticas.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Con menos companeros que esto en su paralelo se compara con todo el grupo. */
const MIN_PEERS = 3;

const GAMES: GameId[] = ["color-sequence", "node-connection", "mini-cases"];

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

/** El nivel mas alto de un juego en una lista de resultados: aprobado en Seriacion, completado en Nodos. */
function maxLevelOf(results: ResultRow[], game: GameId): number {
  return results
    .filter((r) => r.gameId === game && (game !== "color-sequence" || isColorSequenceResultPassed(r)))
    .reduce((max, r) => Math.max(max, r.index), 0);
}

/** Segundos del primer intento de cada nivel, de la lista de resultados. */
function firstTrySeconds(results: ResultRow[], game: GameId): number[] {
  return results.filter((r) => r.gameId === game && r.tryNumber === 1).map((r) => r.activeMsNet / 1000);
}

const SECONDS = (value: number | null) => (value === null ? "Sin datos" : `${String(round(value, 1)).replace(".", ",")} s`);

/**
 * «Sin terminar» no es «abandonada»: la partida queda abierta hasta que el estudiante la
 * termine o falle, y si vuelve la retoma. Lo que se sabe es cuándo fue su última actividad.
 */
function outcomeOf(attempt: AttemptRow, now: Date): string {
  if (attempt.status === "finished") return "Terminada";
  if (attempt.status === "failed") return "Fallida";

  const days = Math.floor((now.getTime() - attempt.lastActivityAt.getTime()) / DAY_MS);

  return `Sin terminar (${days <= 0 ? "activa hoy" : `última actividad hace ${days} ${days === 1 ? "día" : "días"}`})`;
}

function empty(chart: ChartId, title: string, now: Date): ChartResult {
  return {
    chart,
    title,
    views: [],
    exploratory: false,
    xLabel: "",
    yLabel: "",
    unit: "students",
    unitLabel: "estudiantes",
    categories: [],
    series: [],
    warnings: [],
    notes: [],
    studentsTotal: 1,
    generatedAt: now.toISOString(),
  };
}

const partidasText = (count: number) => (count === 1 ? "su única partida" : `sus ${count} partidas`);

/** Cuantas partidas de un juego dejaron algun resultado guardado: las que de verdad entran en los graficos. */
function attemptsWithData(game: GameId, attempts: AttemptRow[], results: ResultRow[]): AttemptRow[] {
  return attempts
    .filter((a) => a.gameId === game && results.some((r) => r.attemptId === a.attemptId))
    .sort((a, b) => a.attemptNumber - b.attemptNumber);
}

/** Segundos del primer intento de cada nivel de una partida (mediana si un nivel aparece mas de una vez). */
function secondsByLevel(attempt: AttemptRow, results: ResultRow[]): Map<number, number> {
  const grouped = new Map<number, number[]>();

  for (const r of results) {
    if (r.attemptId !== attempt.attemptId || r.gameId !== attempt.gameId || r.tryNumber !== 1) continue;

    grouped.set(r.index, [...(grouped.get(r.index) ?? []), r.activeMsNet / 1000]);
  }

  return new Map([...grouped].map(([level, seconds]) => [level, median(seconds) as number]));
}

/**
 * Su tiempo en cada nivel en la primera y en la ultima partida, solo en los niveles que jugo en las dos.
 * Comparar el «tiempo tipico» de cada partida mezclaba velocidad con cuanto avanzo: cada nivel pide mas
 * que el anterior, asi que una partida larga siempre salia mas lenta. Nivel a nivel si es comparable.
 */
function firstVsLast(game: GameId, attempts: AttemptRow[], results: ResultRow[], now: Date): StudentProfileChart | null {
  const withTimes = attemptsWithData(game, attempts, results).filter((a) => secondsByLevel(a, results).size > 0);

  if (withTimes.length < 2) return null;

  const first = withTimes[0] as AttemptRow;
  const last = withTimes[withTimes.length - 1] as AttemptRow;
  const before = secondsByLevel(first, results);
  const after = secondsByLevel(last, results);
  const levels = [...before.keys()].filter((level) => after.has(level)).sort((a, b) => a - b);

  if (levels.length === 0) return null;

  const title = "Tiempo por nivel: primera y última partida";

  return {
    id: "st-time",
    title,
    description:
      "Compara cuánto tardó en cada nivel entre su primera y su última partida, solo en los niveles que jugó en las dos. Si la línea de la última partida queda por debajo, ahora resuelve esos niveles más rápido. Es el tiempo del primer intento de cada nivel.",
    result: {
      ...empty("st-time", title, now),
      views: ["lines", "bars"],
      xLabel: "Nivel",
      yLabel: "Segundos (primer intento)",
      unit: "seconds",
      unitLabel: "segundos",
      basis: `Compara la partida ${first.attemptNumber} con la partida ${last.attemptNumber}, en los ${levels.length} niveles que jugó en ambas.`,
      categories: levels.map((level) => `Nivel ${level}`),
      series: [
        {
          key: "first",
          label: `Primera: partida ${first.attemptNumber}`,
          slot: 0,
          n: 1,
          values: levels.map((l) => round(before.get(l) as number, 1)),
          ns: levels.map(() => 1),
        },
        {
          key: "last",
          label: `Última: partida ${last.attemptNumber}`,
          slot: 1,
          n: 1,
          values: levels.map((l) => round(after.get(l) as number, 1)),
          ns: levels.map(() => 1),
        },
      ],
      notes: [
        "Es el tiempo activo del primer intento de cada nivel: solo cuenta mientras la pantalla estuvo visible y sin pausas largas.",
        "Solo se comparan los niveles que jugó en las dos partidas. Así la diferencia no depende de cuánto avanzó en cada una.",
      ],
    },
  };
}

/** El nivel mas alto de Conexion de nodos que completo en cada partida, en el orden en que las jugo. */
function nodeLevelByAttempt(attempts: AttemptRow[], results: ResultRow[], now: Date): StudentProfileChart | null {
  const ordered = attemptsWithData("node-connection", attempts, results);

  if (ordered.length === 0) return null;

  const title = "Mejora entre partidas";

  return {
    id: "st-levels",
    title,
    description:
      "Cada punto es una partida, en el orden en que la jugó (1 = la primera). Su altura es el nivel más alto de Conexión de nodos que completó en esa partida: si la línea sube, llegó más lejos que antes.",
    result: {
      ...empty("st-levels", title, now),
      views: ["lines", "bars"],
      xLabel: "Partida (1 = la primera que jugó)",
      yLabel: "Nivel más alto completado",
      unit: "level",
      unitLabel: "nivel",
      basis: `Calculado con ${partidasText(ordered.length)}.`,
      categories: ordered.map((attempt) => String(attempt.attemptNumber)),
      series: [
        {
          key: "student",
          label: "Nivel más alto completado",
          slot: 0,
          n: 1,
          values: ordered.map((attempt) => maxLevelOf(results.filter((r) => r.attemptId === attempt.attemptId), "node-connection")),
          ns: ordered.map(() => 1),
        },
      ],
      notes: [
        "Se usan todas sus partidas de Conexión de nodos.",
        "Cada punto es una partida, en el orden en que la jugó. Su altura es el nivel más alto que completó en esa partida.",
      ],
    },
  };
}

/** Veces que empezo de nuevo (y corrigio con Deshacer) en cada nivel de Nodos. */
function nodeRestarts(attempts: AttemptRow[], results: ResultRow[], now: Date): StudentProfileChart | null {
  const byLevel = new Map<number, { restarts: number; undo: number }>();

  for (const result of results.filter((r) => r.gameId === "node-connection")) {
    const current = byLevel.get(result.index) ?? { restarts: 0, undo: 0 };

    current.restarts += num(result.metrics.resetCount) + num(result.metrics.routeRestarts);
    current.undo += num(result.metrics.undoCount);
    byLevel.set(result.index, current);
  }

  if (byLevel.size === 0) return null;

  const levels = [...byLevel.keys()].sort((a, b) => a - b);
  const title = "Veces que empezó de nuevo por nivel";

  return {
    id: "st-restarts",
    title,
    description:
      "En cada nivel de Conexión de nodos, cuántas veces empezó de nuevo (reinició el nivel o rehízo una ruta ya dibujada) y cuántas veces corrigió con «Deshacer», que solo retrocede el último movimiento. Más barras en un nivel indican que le costó encontrar el camino. Suma todas sus partidas.",
    result: {
      ...empty("st-restarts", title, now),
      views: ["bars"],
      xLabel: "Nivel",
      yLabel: "Veces",
      unit: "count",
      unitLabel: "veces",
      basis: `Suma de ${partidasText(attemptsWithData("node-connection", attempts, results).length)}.`,
      legendNote:
        "«Empezó de nuevo»: reinició el nivel o rehízo una ruta ya dibujada. «Corrigió con Deshacer»: deshizo solo el último movimiento.",
      categories: levels.map((level) => `Nivel ${level}`),
      series: [
        {
          key: "restarts",
          label: "Empezó de nuevo",
          slot: 0,
          n: 1,
          values: levels.map((l) => byLevel.get(l)?.restarts ?? 0),
          ns: levels.map(() => 1),
        },
        {
          key: "undo",
          label: "Corrigió con Deshacer",
          slot: 1,
          n: 1,
          values: levels.map((l) => byLevel.get(l)?.undo ?? 0),
          ns: levels.map(() => 1),
        },
      ],
      notes: [
        "«Empezó de nuevo» suma reiniciar el nivel completo y rehacer una ruta ya dibujada (empezar de nuevo desde un punto anterior).",
        "«Corrigió con Deshacer» cuenta las veces que usó el botón «Deshacer», que retrocede solo el último movimiento.",
        "El juego guarda el nivel cuando se completa: lo que hizo en un nivel que aún no completa no aparece.",
      ],
    },
  };
}

type SingleText = {
  description: string;
  xLabel?: string;
  yLabel?: string;
  /** Reemplaza las notas del grafico. */
  notes?: string[];
  /** Se agregan a las notas del grafico. */
  moreNotes?: string[];
  basis: string;
};

/** Textos de cada grafico escritos para un solo estudiante: la descripcion habla de «el» y la base dice con cuantos datos se calculo. */
function singleTexts(id: ChartId, result: ChartResult, games: Record<GameId, number>): SingleText | null {
  const counted = result.series.reduce((sum, series) => sum + series.ns.reduce((a, n) => a + n, 0), 0);
  const cs = partidasText(games["color-sequence"]);
  const mc = partidasText(games["mini-cases"]);
  const nc = partidasText(games["node-connection"]);

  switch (id) {
    case "cs-improvement":
      return {
        description:
          "Cada punto es una partida, en el orden en que la jugó (1 = la primera). Su altura es el nivel más alto que superó en esa partida: si la línea sube, llegó más lejos que antes.",
        xLabel: "Partida (1 = la primera que jugó)",
        yLabel: "Nivel más alto superado",
        notes: [
          "Se usan todas sus partidas de Seriación de colores.",
          "Cada punto es una partida, en el orden en que la jugó. Su altura es el nivel más alto que superó en esa partida.",
        ],
        basis: `Calculado con ${cs}.`,
      };
    case "cs-time":
      return {
        description:
          "Cuánto tardó en responder cada nivel, contando solo el primer intento. Si jugó varias partidas, es la mediana de sus tiempos en ese nivel: el valor del medio, que unos pocos tiempos muy largos no distorsionan.",
        yLabel: "Segundos (mediana)",
        moreNotes: ["En cada nivel se toma la mediana de sus tiempos entre las partidas que lo jugaron."],
        basis: `Calculado con ${cs}, en el primer intento de cada nivel.`,
      };
    case "cs-tries":
      return {
        description:
          "Cada nivel da hasta 3 intentos. Aquí se ve en qué porcentaje de los niveles que jugó lo superó a la primera, al segundo o al tercer intento, y en cuántos no lo logró.",
        basis: `Calculado con ${counted} niveles jugados en ${cs}.`,
      };
    case "cs-error-type":
      return {
        description:
          "Cuando se equivocó, ¿cambió dos colores de lugar (intercambio) o puso un color que no correspondía (sustitución)? Ayuda a ver si el error viene del orden o de recordar los colores.",
        basis: `Calculado con ${counted} errores en ${cs}.`,
      };
    case "cs-first-error":
      return {
        description:
          "En las respuestas con error del primer intento, en qué parte de la secuencia ocurrió el primer fallo: al comienzo, en la parte central o al final. Por ejemplo, en una secuencia de 9 colores el comienzo son los colores 1 a 3, la parte central del 4 al 6 y el final del 7 al 9. Un fallo temprano suele hablar de no haber retenido el comienzo; uno tardío, de perder el hilo.",
        basis: `Calculado con ${counted} respuestas con error en ${cs}.`,
      };
    case "nc-time":
      return {
        description:
          "Cuánto tardó en completar cada nivel de Conexión de nodos. Si jugó varias partidas, es la mediana de sus tiempos en ese nivel: el valor del medio, que unos pocos tiempos muy largos no distorsionan.",
        yLabel: "Segundos (mediana)",
        moreNotes: ["En cada nivel se toma la mediana de sus tiempos entre las partidas que lo completaron."],
        basis: `Calculado con ${nc}.`,
      };
    case "mc-steps":
      return {
        description:
          "En cada mini caso hay que ordenar 4 pasos. Cada barra es el promedio de pasos que puso en su lugar correcto (de 0 a 4) en ese caso, entre las partidas que jugó.",
        yLabel: "Pasos correctos (promedio)",
        moreNotes: ["Si jugó el caso en varias partidas, se promedian sus resultados; con una sola partida es ese mismo resultado."],
        basis: `Promedio de ${mc} de Mini casos.`,
      };
    case "mc-time":
      return {
        description:
          "Cuánto tardó en decidir el orden de los 4 pasos de cada caso, sin contar pausas largas de inactividad. Si jugó el caso en varias partidas, es la mediana de sus tiempos.",
        yLabel: "Segundos (mediana)",
        moreNotes: ["Si jugó el caso en varias partidas, se toma la mediana de sus tiempos; con una sola es ese mismo tiempo."],
        basis: `Mediana de ${mc} de Mini casos.`,
      };
    default:
      return null;
  }
}

/** Pide un grafico del catalogo solo para este estudiante; null si no se puede o no tiene datos. */
function catalogChart(
  id: ChartId,
  rut: string,
  data: StatsData,
  now: Date,
  games: Record<GameId, number>,
): StudentProfileChart | null {
  const parsed = parseChartRequest({ chart: id, groupBy: "student", students: JSON.stringify([rut]) });

  if (!parsed.ok) return null;

  const result = buildChart(parsed.def, parsed.request, data, now);

  // Un grafico sin ningun dato (el estudiante no tiene nada que mostrar ahi) no se muestra.
  const hasData = result.series.some((series) => series.ns.some((n) => n > 0));

  if (!hasData && !result.table && !result.cards) return null;

  const text = singleTexts(id, result, games);

  if (!text) return { id, title: result.title, description: parsed.def.blurb, result };

  return {
    id,
    title: result.title,
    description: text.description,
    result: {
      ...result,
      ...(text.xLabel ? { xLabel: text.xLabel } : {}),
      ...(text.yLabel ? { yLabel: text.yLabel } : {}),
      notes: text.notes ?? [...result.notes, ...(text.moreNotes ?? [])],
      basis: text.basis,
    },
  };
}

type Comparison = { label: string; level: Record<GameId, number | null>; seconds: Record<GameId, number | null> };

/** Con quien se compara: su paralelo si hay suficientes companeros, o todo el grupo. */
function comparisonOf(student: StudentRow, data: StatsData): Comparison {
  const others = data.students.filter((s) => s.enabled !== false && s.rut !== student.rut);
  const peers =
    student.paralelo == null ? [] : others.filter((s) => s.paralelo === student.paralelo);
  const group = peers.length >= MIN_PEERS ? peers : others;
  const label =
    peers.length >= MIN_PEERS
      ? `su paralelo (${group.length} estudiantes)`
      : `todo el grupo (${group.length} estudiantes)`;

  const ruts = new Set(group.map((s) => s.rut));
  const resultsOf = (game: GameId) => data.results.filter((r) => ruts.has(r.studentRut) && r.gameId === game);
  const players = (game: GameId) => new Set(data.attempts.filter((a) => a.gameId === game && ruts.has(a.studentRut)).map((a) => a.studentRut));

  const levelOf = (game: GameId) => {
    const played = players(game);
    const results = resultsOf(game);

    return median([...played].map((rut) => maxLevelOf(results.filter((r) => r.studentRut === rut), game)));
  };

  const timeOf = (game: GameId) => median(firstTrySeconds(resultsOf(game), game));

  return {
    label,
    level: {
      "color-sequence": levelOf("color-sequence"),
      "node-connection": levelOf("node-connection"),
      "mini-cases": null,
    },
    seconds: {
      "color-sequence": timeOf("color-sequence"),
      "node-connection": timeOf("node-connection"),
      "mini-cases": null,
    },
  };
}

export function buildStudentProfile(rut: string, data: StatsData, now: Date = new Date()): StudentProfile | null {
  const student = data.students.find((s) => s.rut === rut);

  if (!student) return null;

  const attempts = data.attempts.filter((a) => a.studentRut === rut);
  const results = data.results.filter((r) => r.studentRut === rut);
  const comparison = comparisonOf(student, data);

  // Los graficos se calculan con los datos de este estudiante solo, aunque este inhabilitado:
  // el admin lo pidio por nombre.
  const chartData: StatsData = {
    ...data,
    students: [{ ...student, enabled: true }],
    attempts,
    results,
  };

  // --------------------------------------------------------------- tarjetas
  const played = (game: GameId) => attempts.filter((a) => a.gameId === game);
  const finished = attempts.filter((a) => a.status === "finished").length;
  const failed = attempts.filter((a) => a.status === "failed").length;
  const open = attempts.length - finished - failed;
  const first = attempts.length === 0 ? null : attempts.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));
  const last = attempts.length === 0 ? null : attempts.reduce((a, b) => (b.lastActivityAt > a.lastActivityAt ? b : a));
  const idleDays = last === null ? null : Math.floor((now.getTime() - last.lastActivityAt.getTime()) / DAY_MS);
  const unlock = (data.unlocks ?? []).find((u) => u.studentRut === rut && u.gameId === "mini-cases");
  const progress = miniCasesProgress([student], results)[0];

  const levelCard = (game: GameId, label: string) => {
    const mine = played(game).length > 0 ? maxLevelOf(results, game) : null;
    const typical = comparison.level[game];

    return {
      label: `Nivel máximo en ${label}`,
      value: mine === null ? "Sin partidas" : String(mine),
      ...(typical === null ? {} : { hint: `Mediana de ${comparison.label}: ${String(round(typical, 1)).replace(".", ",")}` }),
    };
  };

  const timeCard = (game: GameId, label: string) => {
    const mine = median(firstTrySeconds(results, game));
    const typical = comparison.seconds[game];

    return {
      label: `Tiempo típico por nivel en ${label}`,
      value: SECONDS(mine),
      ...(typical === null ? {} : { hint: `Mediana de ${comparison.label}: ${SECONDS(typical)}` }),
    };
  };

  const cards: ChartCards = [
    {
      group: "Resumen",
      slot: 0,
      items: [
        {
          label: "Partidas jugadas",
          value: String(attempts.length),
          hint: GAMES.map((game) => `${GAME_LABELS[game]} ${played(game).length}`).join(" · "),
        },
        {
          label: "Cómo terminaron",
          value: `${finished} terminadas`,
          hint: `${failed} fallidas · ${open} sin terminar`,
        },
        { label: "Primera partida", value: first ? chileDate(first.startedAt) : "Sin partidas" },
        {
          label: "Última actividad",
          value: last ? chileDate(last.lastActivityAt) : "Sin partidas",
          ...(idleDays === null ? {} : { hint: idleDays === 0 ? "Hoy" : `Hace ${idleDays} ${idleDays === 1 ? "día" : "días"}` }),
        },
        {
          label: "Mini casos",
          value: unlock ? "Desbloqueado" : "Sin desbloquear",
          hint: unlock ? `El ${chileDate(unlock.unlockedAt)}` : progress?.text,
        },
        levelCard("color-sequence", "Seriación"),
        levelCard("node-connection", "Nodos"),
        timeCard("color-sequence", "Seriación"),
        timeCard("node-connection", "Nodos"),
      ],
    },
  ];

  // -------------------------------------------------------------- historial
  const history = {
    columns: ["Juego", "Partida", "Inicio", "Estado", "Resultados guardados", "Mejor nivel", "Tiempo activo (min)"],
    rows: [...attempts]
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .map((attempt) => {
        const own = results.filter((r) => r.attemptId === attempt.attemptId);

        return [
          GAME_LABELS[attempt.gameId],
          attempt.attemptNumber,
          chileDate(attempt.startedAt),
          outcomeOf(attempt, now),
          own.length,
          attempt.gameId === "mini-cases" || own.length === 0 ? null : maxLevelOf(own, attempt.gameId),
          round(own.reduce((sum, r) => sum + r.activeMsNet, 0) / 60_000, 1),
        ];
      }),
  };

  // --------------------------------------------------------- graficos por juego
  // Con cuantas partidas (con resultados guardados) se calcula cada juego.
  const partidas = Object.fromEntries(
    GAMES.map((game) => [game, attemptsWithData(game, attempts, results).length]),
  ) as Record<GameId, number>;

  const games = GAMES.map((game) => {
    const mine = played(game);
    const charts: StudentProfileChart[] = [];

    if (mine.length > 0) {
      const pick = (id: ChartId) => {
        const chart = catalogChart(id, rut, chartData, now, partidas);

        if (chart) charts.push(chart);
      };
      const add = (chart: StudentProfileChart | null) => {
        if (chart) charts.push(chart);
      };

      if (game === "color-sequence") {
        pick("cs-improvement");
        pick("cs-time");
        add(firstVsLast(game, attempts, results, now));
        pick("cs-tries");
        pick("cs-error-type");
        pick("cs-first-error");
      } else if (game === "node-connection") {
        add(nodeLevelByAttempt(attempts, results, now));
        pick("nc-time");
        add(firstVsLast(game, attempts, results, now));
        add(nodeRestarts(attempts, results, now));
      } else {
        pick("mc-steps");
        pick("mc-time");
      }
    }

    return { game, label: GAME_LABELS[game], played: mine.length > 0, attempts: mine.length, charts };
  });

  return {
    student: {
      rut: student.rut,
      name: fullName(student),
      paralelo: student.paralelo ?? null,
      university: universityText(student.university),
      shift: shiftText(student.studyShift),
      ciudad: student.ciudad ?? "",
      enabled: student.enabled !== false,
    },
    cards,
    history,
    games,
    // Explica las tarjetas del resumen: se muestra al pie de esa tarjeta.
    notes: [
      `Las medianas de comparación son las de ${comparison.label}, sin contar a este estudiante, y solo de quienes jugaron ese juego.`,
    ],
    generatedAt: now.toISOString(),
  };
}
