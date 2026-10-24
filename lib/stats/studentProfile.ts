import { isColorSequenceResultPassed } from "../gameAttempts";
import { buildChart } from "./charts";
import { chileDate, fullName, miniCasesProgress, shiftText, universityText } from "./chartsLists";
import { isAbandoned } from "./engine";
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

const CATALOG_CHARTS: Record<GameId, ChartId[]> = {
  "color-sequence": ["cs-improvement", "cs-time", "cs-tries", "cs-error-type", "cs-first-error"],
  "node-connection": ["nc-levels", "nc-time"],
  "mini-cases": ["mc-steps", "mc-time"],
};

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

function outcomeOf(attempt: AttemptRow, now: Date): string {
  if (attempt.status === "finished") return "Terminada";
  if (attempt.status === "failed") return "Fallida";

  return isAbandoned(attempt, now) ? "Abandonada" : "En curso";
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

/** Tiempo tipico por nivel (primer intento) en cada partida del estudiante, en orden. */
function timeByAttempt(game: GameId, attempts: AttemptRow[], results: ResultRow[], now: Date): StudentProfileChart | null {
  const ordered = attempts.filter((a) => a.gameId === game).sort((a, b) => a.attemptNumber - b.attemptNumber);
  const points = ordered
    .map((attempt) => ({
      attempt,
      value: median(firstTrySeconds(results.filter((r) => r.attemptId === attempt.attemptId), game)),
    }))
    .filter((point): point is { attempt: AttemptRow; value: number } => point.value !== null);

  if (points.length === 0) return null;

  return {
    id: "st-time",
    title: "Tiempo por nivel en cada partida",
    description:
      "Cómo cambió su tiempo típico por nivel de una partida a la siguiente. Si baja con las partidas, está ganando soltura; si sube, puede que los niveles le estén costando más. Es el tiempo del primer intento de cada nivel.",
    result: {
      ...empty("st-time", "Tiempo por nivel en cada partida", now),
      views: ["lines", "bars"],
      xLabel: "Partida",
      yLabel: "Segundos por nivel",
      unit: "seconds",
      unitLabel: "segundos",
      categories: points.map((p) => `Partida ${p.attempt.attemptNumber}`),
      series: [
        {
          key: "student",
          label: "Tiempo típico por nivel (mediana)",
          slot: 0,
          n: 1,
          values: points.map((p) => round(p.value, 1)),
          ns: points.map(() => 1),
        },
      ],
      notes: [
        "Es la mediana del tiempo activo del primer intento de cada nivel que jugó en esa partida.",
        "Se cuenta solo el tiempo en que la pestaña estuvo visible y sin inactividad larga.",
      ],
    },
  };
}

/** Veces que volvio a empezar (y uso Deshacer) en cada nivel de Nodos. */
function nodeRestarts(results: ResultRow[], now: Date): StudentProfileChart | null {
  const byLevel = new Map<number, { restarts: number; undo: number }>();

  for (const result of results.filter((r) => r.gameId === "node-connection")) {
    const current = byLevel.get(result.index) ?? { restarts: 0, undo: 0 };

    current.restarts += num(result.metrics.resetCount) + num(result.metrics.routeRestarts);
    current.undo += num(result.metrics.undoCount);
    byLevel.set(result.index, current);
  }

  if (byLevel.size === 0) return null;

  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return {
    id: "st-restarts",
    title: "Veces que volvió a empezar por nivel",
    description:
      "En cada nivel de Conexión de nodos, cuántas veces rehízo el tablero o una ruta ya dibujada, y cuántas veces usó «Deshacer». Más barras en un nivel indican que le costó encontrar el camino.",
    result: {
      ...empty("st-restarts", "Veces que volvió a empezar por nivel", now),
      views: ["bars"],
      xLabel: "Nivel",
      yLabel: "Veces",
      unit: "count",
      unitLabel: "veces",
      categories: levels.map((level) => `Nivel ${level}`),
      series: [
        {
          key: "restarts",
          label: "Volvió a empezar",
          slot: 0,
          n: 1,
          values: levels.map((l) => byLevel.get(l)?.restarts ?? 0),
          ns: levels.map(() => 1),
        },
        {
          key: "undo",
          label: "Usó «Deshacer»",
          slot: 1,
          n: 1,
          values: levels.map((l) => byLevel.get(l)?.undo ?? 0),
          ns: levels.map(() => 1),
        },
      ],
      notes: [
        "«Volvió a empezar» suma rehacer el tablero completo y rehacer una ruta ya dibujada.",
        "El juego guarda el nivel cuando se completa: lo que hizo en un nivel que aún no completa no aparece.",
      ],
    },
  };
}

/** Pide un grafico del catalogo solo para este estudiante; null si no se puede o no tiene datos. */
function catalogChart(
  id: ChartId,
  rut: string,
  data: StatsData,
  now: Date,
): StudentProfileChart | null {
  const parsed = parseChartRequest({ chart: id, groupBy: "student", students: JSON.stringify([rut]) });

  if (!parsed.ok) return null;

  const result = buildChart(parsed.def, parsed.request, data, now);

  // Un grafico sin ningun dato (el estudiante no tiene nada que mostrar ahi) no se muestra.
  const hasData = result.series.some((series) => series.ns.some((n) => n > 0));

  if (!hasData && !result.table && !result.cards) return null;

  return { id, title: result.title, description: parsed.def.blurb, result };
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
  const games = GAMES.map((game) => {
    const mine = played(game);
    const charts: StudentProfileChart[] = [];

    if (mine.length > 0) {
      for (const id of CATALOG_CHARTS[game]) {
        const chart = catalogChart(id, rut, chartData, now);

        if (chart) charts.push(chart);
      }

      const time = game === "mini-cases" ? null : timeByAttempt(game, attempts, results, now);
      const restarts = game === "node-connection" ? nodeRestarts(results, now) : null;

      if (time) charts.push(time);
      if (restarts) charts.push(restarts);
    }

    return { game, label: GAME_LABELS[game], played: mine.length > 0, charts };
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
    notes: [
      `Las medianas de comparación son las de ${comparison.label}, sin contar a este estudiante, y solo de quienes jugaron ese juego.`,
      "Los gráficos son los mismos de «Estadísticas», pedidos solo para este estudiante.",
    ],
    generatedAt: now.toISOString(),
  };
}
