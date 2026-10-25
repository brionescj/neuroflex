/**
 * Puntajes del estudiante ("Mis puntuaciones"). Funcion pura: recibe los
 * intentos y resultados que el servidor guardo y arma lo que se muestra.
 *
 * Reglas de diseno:
 *  - Nada depende del tiempo: ni puntos, ni insignias, ni graficos. Medir
 *    rapidez presiona y puede desanimar; aqui solo cuenta el avance.
 *  - Los puntos nunca bajan: se cuenta lo MEJOR logrado en cada nivel (o caso)
 *    entre todas las partidas, asi que perder una partida no le quita nada y
 *    repetir un nivel ya superado tampoco regala puntos extra.
 *  - Todo texto es positivo: lo que falta se muestra como "proxima meta".
 */

import {
  isLevelResultPassed,
  type AttemptGameId,
} from "./gameAttempts";
import { buildBadges, type Badge } from "./studentBadges";

export { BADGE_COUNT, TIER_NAMES } from "./studentBadges";
export type { Badge, BadgeTier } from "./studentBadges";

/** Cuantos niveles tiene Conexion de nodos (src/features/games/node-connection/levels.ts). */
export const NODE_TOTAL_LEVELS = 15;

/** Niveles obligatorios de Seriacion: la escalera nunca muestra menos. */
export const COLOR_MIN_LEVELS = 10;

/** Puntos de un nivel: pasarlo, pasarlo al primer intento y hacerlo sin fallar. */
export const POINTS_LEVEL_PASSED = 10;
export const POINTS_FIRST_TRY = 5;
export const POINTS_FLAWLESS = 5;

/** Puntos de un mini caso: por cada paso en su lugar y un bonus por el orden completo. */
export const POINTS_CASE_STEP = 3;
export const POINTS_CASE_COMPLETE = 8;
export const CASE_STEPS = 4;

/** Cuantas partidas recientes se grafican por juego. */
export const MAX_ATTEMPTS_SHOWN = 8;

export type ScoreAttempt = {
  attemptId: string;
  gameId: AttemptGameId;
  attemptNumber: number;
  status: string;
};

export type ScoreResult = {
  attemptId: string;
  gameId: AttemptGameId;
  key: string;
  index: number;
  tryNumber: number;
  metrics: Record<string, unknown>;
};

export type LadderState = "first-try" | "retry" | "reached" | "pending";

export type LadderLevel = {
  level: number;
  state: LadderState;
  /** Puntos que dio este nivel (0 si todavia no se pasa). */
  points: number;
  /** Mejor porcentaje de aciertos al pasarlo (solo Seriacion). */
  percent?: number;
};

export type AttemptBar = {
  attemptNumber: number;
  /** Nivel mas alto que paso en esa partida. */
  bestLevel: number;
  /** Supero lo mejor de todas las partidas anteriores. */
  isRecord: boolean;
};

export type CaseBar = {
  caseKey: string;
  /** Si el estudiante ya respondio este caso alguna vez. Un caso sin jugar no es un 0: es un caso pendiente. */
  played: boolean;
  /** Mejor cantidad de pasos en su lugar (0 a 4). */
  steps: number;
  complete: boolean;
};

export type NodeMargin = {
  level: number;
  /** Del margen de errores permitido, cuanto sobro (0 a 100). */
  marginPercent: number;
};

export type RankInfo = {
  name: string;
  minPoints: number;
  next: { name: string; minPoints: number } | null;
  pointsToNext: number;
  /** Avance dentro del rango actual hacia el siguiente (100 si ya es el ultimo). */
  progressPercent: number;
};

export type StudentScores = {
  hasPlayed: boolean;
  totalPoints: number;
  rank: RankInfo;
  pointsByGame: { gameId: AttemptGameId; points: number }[];
  stats: {
    levelsPassed: number;
    firstTryLevels: number;
    flawlessLevels: number;
    perfectCases: number;
    finishedAttempts: number;
  };
  colorSequence: {
    ladder: LadderLevel[];
    bestLevel: number;
    attempts: AttemptBar[];
  };
  nodes: {
    ladder: LadderLevel[];
    bestLevel: number;
    attempts: AttemptBar[];
    margins: NodeMargin[];
  };
  /** Todos los casos del banco (los sin jugar van marcados), no solo los jugados. */
  miniCases: { cases: CaseBar[]; total: number; played: number };
  badges: Badge[];
  nextGoal: Badge | null;
};

const RANKS = [
  { name: "Chispa", minPoints: 0 },
  { name: "Destello", minPoints: 60 },
  { name: "Llama", minPoints: 180 },
  { name: "Estrella", minPoints: 350 },
  { name: "Constelación", minPoints: 550 },
] as const;

export function rankFor(points: number): RankInfo {
  let index = 0;

  RANKS.forEach((rank, i) => {
    if (points >= rank.minPoints) index = i;
  });

  const current = RANKS[index]!;
  const next = RANKS[index + 1] ?? null;

  if (!next) {
    return {
      name: current.name,
      minPoints: current.minPoints,
      next: null,
      pointsToNext: 0,
      progressPercent: 100,
    };
  }

  const span = next.minPoints - current.minPoints;

  return {
    name: current.name,
    minPoints: current.minPoints,
    next: { name: next.name, minPoints: next.minPoints },
    pointsToNext: next.minPoints - points,
    progressPercent: Math.floor(((points - current.minPoints) / span) * 100),
  };
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Hizo el nivel sin fallar: todos los colores bien (Seriacion) o cero errores (Nodos). */
function isFlawless(result: ScoreResult): boolean {
  if (result.gameId === "color-sequence") {
    const length = num(result.metrics.sequenceLength);

    return length > 0 && num(result.metrics.correctCount) === length;
  }

  return typeof result.metrics.errors === "number" && result.metrics.errors === 0;
}

type LevelSummary = {
  level: number;
  passed: boolean;
  firstTry: boolean;
  flawless: boolean;
  percent?: number;
  margin?: number;
  /** Fallo este nivel y despues lo paso, en la misma partida. */
  comeback: boolean;
};

/** Lo mejor logrado en cada nivel de un juego de niveles, entre todas las partidas. */
function summarizeLevels(results: ScoreResult[]): Map<number, LevelSummary> {
  const byLevel = new Map<number, LevelSummary>();
  const failedIn = new Set<string>();

  const ordered = [...results].sort(
    (a, b) => a.index - b.index || a.tryNumber - b.tryNumber,
  );

  for (const result of ordered) {
    const entry =
      byLevel.get(result.index) ??
      ({
        level: result.index,
        passed: false,
        firstTry: false,
        flawless: false,
        comeback: false,
      } satisfies LevelSummary);

    byLevel.set(result.index, entry);

    const slot = `${result.attemptId}:${result.index}`;

    if (!isLevelResultPassed(result)) {
      failedIn.add(slot);
      continue;
    }

    entry.passed = true;
    if (result.tryNumber === 1) entry.firstTry = true;
    if (isFlawless(result)) entry.flawless = true;
    if (failedIn.has(slot)) entry.comeback = true;

    if (result.gameId === "color-sequence") {
      const length = num(result.metrics.sequenceLength);
      const percent =
        typeof result.metrics.percent === "number"
          ? result.metrics.percent
          : length > 0
            ? Math.round((num(result.metrics.correctCount) / length) * 100)
            : 0;

      entry.percent = Math.max(entry.percent ?? 0, percent);
    } else {
      const allowed = num(result.metrics.errorsAllowed);

      if (allowed > 0 && typeof result.metrics.errors === "number") {
        const margin = Math.round(((allowed - result.metrics.errors) / allowed) * 100);

        entry.margin = Math.max(entry.margin ?? 0, Math.min(100, Math.max(0, margin)));
      }
    }
  }

  return byLevel;
}

function levelPoints(entry: LevelSummary): number {
  if (!entry.passed) return 0;

  return (
    POINTS_LEVEL_PASSED +
    (entry.firstTry ? POINTS_FIRST_TRY : 0) +
    (entry.flawless ? POINTS_FLAWLESS : 0)
  );
}

function buildLadder(
  summary: Map<number, LevelSummary>,
  minLevels: number,
): { ladder: LadderLevel[]; bestLevel: number } {
  const reached = Math.max(0, ...summary.keys());
  const length = Math.max(minLevels, reached);
  const ladder: LadderLevel[] = [];
  let bestLevel = 0;

  for (let level = 1; level <= length; level++) {
    const entry = summary.get(level);

    if (!entry) {
      ladder.push({ level, state: "pending", points: 0 });
      continue;
    }

    if (entry.passed) bestLevel = Math.max(bestLevel, level);

    ladder.push({
      level,
      state: entry.passed ? (entry.firstTry ? "first-try" : "retry") : "reached",
      points: levelPoints(entry),
      ...(entry.percent !== undefined ? { percent: entry.percent } : {}),
    });
  }

  return { ladder, bestLevel };
}

/** Mejor nivel pasado en cada partida, con las marcas nuevas senaladas. */
function buildAttemptBars(
  attempts: ScoreAttempt[],
  results: ScoreResult[],
): AttemptBar[] {
  const bestByAttempt = new Map<string, number>();

  for (const result of results) {
    if (!isLevelResultPassed(result)) continue;

    bestByAttempt.set(
      result.attemptId,
      Math.max(bestByAttempt.get(result.attemptId) ?? 0, result.index),
    );
  }

  const bars: AttemptBar[] = [];
  let record = 0;

  for (const attempt of [...attempts].sort((a, b) => a.attemptNumber - b.attemptNumber)) {
    const bestLevel = bestByAttempt.get(attempt.attemptId) ?? 0;

    // La primera partida no "supera" nada: una marca nueva exige tener con que compararse.
    bars.push({
      attemptNumber: attempt.attemptNumber,
      bestLevel,
      isRecord: bars.length > 0 && bestLevel > record,
    });

    record = Math.max(record, bestLevel);
  }

  return bars.slice(-MAX_ATTEMPTS_SHOWN);
}

/**
 * Mejor resultado de cada caso, entre todas las partidas. Se listan TODOS los casos del
 * banco: uno sin jugar sale como pendiente. Mostrar solo los jugados hacia parecer un
 * "4/4 en todos" a quien respondio pocos casos.
 */
function buildCases(
  results: ScoreResult[],
  bankKeys: string[],
): { cases: CaseBar[]; points: number; played: number } {
  const byCase = new Map<string, CaseBar>();

  for (const result of results) {
    const steps = Math.min(CASE_STEPS, Math.max(0, num(result.metrics.correctSteps)));
    const complete = result.metrics.isFullyCorrect === true;
    const entry = byCase.get(result.key) ?? { caseKey: result.key, played: true, steps: 0, complete: false };

    entry.steps = Math.max(entry.steps, steps);
    entry.complete = entry.complete || complete;
    byCase.set(result.key, entry);
  }

  // Primero los del banco, en su orden; despues los jugados que ya no estan en el banco.
  const cases: CaseBar[] = bankKeys.map(
    (key) => byCase.get(key) ?? { caseKey: key, played: false, steps: 0, complete: false },
  );

  for (const [key, entry] of byCase) {
    if (!bankKeys.includes(key)) cases.push(entry);
  }

  const points = cases.reduce(
    (sum, c) => sum + c.steps * POINTS_CASE_STEP + (c.complete ? POINTS_CASE_COMPLETE : 0),
    0,
  );

  return { cases, points, played: byCase.size };
}

/** Partidas de 5 o mas niveles superados, todos al primer intento y sin un solo intento perdido. */
function countFlawlessRuns(results: ScoreResult[]): number {
  const byAttempt = new Map<string, ScoreResult[]>();

  for (const result of results) {
    const list = byAttempt.get(result.attemptId) ?? [];

    list.push(result);
    byAttempt.set(result.attemptId, list);
  }

  let runs = 0;

  for (const list of byAttempt.values()) {
    const clean = list.every((r) => r.tryNumber === 1 && isLevelResultPassed(r));

    if (clean && new Set(list.map((r) => r.index)).size >= 5) runs += 1;
  }

  return runs;
}

export function buildStudentScores(input: {
  attempts: ScoreAttempt[];
  results: ScoreResult[];
  /** Claves de los casos habilitados del banco, en el orden en que se numeran. */
  caseKeys?: string[];
}): StudentScores {
  const of = (gameId: AttemptGameId) => ({
    attempts: input.attempts.filter((a) => a.gameId === gameId),
    results: input.results.filter((r) => r.gameId === gameId),
  });

  const color = of("color-sequence");
  const nodes = of("node-connection");
  const cases = of("mini-cases");

  const colorSummary = summarizeLevels(color.results);
  const nodeSummary = summarizeLevels(nodes.results);

  const colorLadder = buildLadder(colorSummary, COLOR_MIN_LEVELS);
  const nodeLadder = buildLadder(nodeSummary, NODE_TOTAL_LEVELS);
  const caseData = buildCases(cases.results, input.caseKeys ?? []);

  const points = (ladder: LadderLevel[]) => ladder.reduce((sum, l) => sum + l.points, 0);

  const pointsByGame = [
    { gameId: "color-sequence" as const, points: points(colorLadder.ladder) },
    { gameId: "node-connection" as const, points: points(nodeLadder.ladder) },
    { gameId: "mini-cases" as const, points: caseData.points },
  ];

  const totalPoints = pointsByGame.reduce((sum, g) => sum + g.points, 0);

  const allLevels = [...colorSummary.values(), ...nodeSummary.values()];
  const count = (predicate: (l: LevelSummary) => boolean) =>
    allLevels.filter(predicate).length;

  const stats = {
    levelsPassed: count((l) => l.passed),
    firstTryLevels: count((l) => l.passed && l.firstTry),
    flawlessLevels: count((l) => l.passed && l.flawless),
    perfectCases: caseData.cases.filter((c) => c.complete).length,
    finishedAttempts: input.attempts.filter((a) => a.status === "finished").length,
  };

  const colorAttempts = buildAttemptBars(color.attempts, color.results);
  const nodeAttempts = buildAttemptBars(nodes.attempts, nodes.results);

  const records = [...colorAttempts, ...nodeAttempts].filter((a) => a.isRecord).length;
  const comebacks = count((l) => l.comeback);
  const gamesPlayed = [color, nodes, cases].filter((g) => g.results.length > 0).length;
  const colorFlawless = [...colorSummary.values()].filter((l) => l.flawless).length;
  const nodeFlawless = [...nodeSummary.values()].filter((l) => l.flawless).length;

  const wideMarginNodes = [...nodeSummary.values()].filter(
    (l) => l.passed && l.margin !== undefined && l.margin > 50,
  ).length;

  const badges = buildBadges({
    totalPoints,
    levelsPassed: stats.levelsPassed,
    firstTryLevels: stats.firstTryLevels,
    flawlessSeriation: colorFlawless,
    flawlessNodes: nodeFlawless,
    wideMarginNodes,
    seriationBest: colorLadder.bestLevel,
    nodesBest: nodeLadder.bestLevel,
    gamesPlayed,
    finishedAttempts: stats.finishedAttempts,
    comebacks,
    records,
    flawlessRuns: countFlawlessRuns([...color.results, ...nodes.results]),
    perfectCases: stats.perfectCases,
    playedCases: caseData.played,
    totalCases: input.caseKeys?.length ?? 0,
  });

  // La proxima meta es la mas cercana de lograrse; a igual avance, la mas facil (menor nivel).
  const nextGoal =
    badges
      .filter((b) => !b.earned)
      .sort((a, b) => b.current / b.goal - a.current / a.goal || a.tier - b.tier)[0] ?? null;

  return {
    hasPlayed: input.results.length > 0,
    totalPoints,
    rank: rankFor(totalPoints),
    pointsByGame,
    stats,
    colorSequence: { ...colorLadder, attempts: colorAttempts },
    nodes: {
      ...nodeLadder,
      attempts: nodeAttempts,
      margins: [...nodeSummary.values()]
        .filter((l) => l.passed && l.margin !== undefined)
        .map((l) => ({ level: l.level, marginPercent: l.margin ?? 0 })),
    },
    miniCases: { cases: caseData.cases, total: caseData.cases.length, played: caseData.played },
    badges,
    nextGoal,
  };
}
