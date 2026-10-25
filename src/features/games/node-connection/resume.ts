import {
  optionalIsoDate,
  optionalTimeMs,
  parseAttemptHandle,
} from "../attempts/attemptHandle";
import type { AttemptHandle } from "../attempts/types";
import { arePathsValid, isSolved } from "./board";
import { NODE_COLORS } from "./colors";
import { cleanDroppedCount, cleanNodeEvents } from "./events";
import { LEVELS, TOTAL_LEVELS } from "./levels";
import { replayFlow } from "./rules";
import { cleanStats } from "./stats";
import type {
  Cell,
  NodeColorId,
  NodeEvent,
  NodeLevelResult,
  NodePaths,
  NodeStats,
} from "./types";

/**
 * - playing: intento en curso.
 * - level-complete: paso el nivel, espera "Siguiente nivel".
 * - level-failed: se acabo el margen de errores y le quedan intentos: espera "Reintentar".
 * - finished: la partida termino (completo los 15 niveles o agoto los intentos desde el 11).
 * - failed: agoto los intentos en un nivel obligatorio (1 a 10).
 */
export type NodeConnectionSavedPhase =
  | "playing"
  | "level-complete"
  | "level-failed"
  | "finished"
  | "failed";

type SerializedPath = { color: NodeColorId; cells: [number, number][] };

/**
 * Avance guardado de Conexion de nodos. Se guarda al empezar cada nivel,
 * al soltar cada trazo, cada pocos segundos y al terminar el nivel.
 *
 * `elapsedMs` es tiempo ACTIVO acumulado del nivel en curso (solo "playing"):
 * al reanudar el reloj sigue desde ahi. Asi un F5 no lo reinicia ni se suma
 * el tiempo que el alumno estuvo fuera.
 */
export type NodeConnectionProgress = {
  version: 1;
  phase: NodeConnectionSavedPhase;
  /** Nivel en curso o recien terminado, desde 1. */
  level: number;
  /** Intento del nivel en curso o recien terminado (ausente en avances anteriores a los reintentos: 1). */
  tryNumber?: number;
  /** Trazos del nivel en curso. Vacio fuera de "playing". */
  paths: SerializedPath[];
  elapsedMs: number;
  undoCount: number;
  resetCount: number;
  /** Tiempo activo neto del nivel en curso (sin la inactividad de mas de 80 s). */
  netMs?: number;
  /** Contadores del nivel en curso (ausentes en avances anteriores a registrarlos). */
  stats?: NodeStats;
  /**
   * Bitacora del nivel en curso (trazos, deshacer, reinicios, bloqueos).
   * Los niveles ya terminados no la conservan: salen hacia la base apenas se
   * completan.
   */
  events?: NodeEvent[];
  /** Eventos del nivel en curso que superaron el tope de la bitacora. */
  eventsDropped?: number;
  results: NodeLevelResult[];
  /** Partida a la que pertenece (ausente en avances anteriores al registro). */
  attempt?: AttemptHandle;
};

const SAVED_PHASES: NodeConnectionSavedPhase[] = [
  "playing",
  "level-complete",
  "level-failed",
  "finished",
  "failed",
];

const COLOR_IDS = new Set<string>(NODE_COLORS.map((c) => c.id));

// Un tope razonable evita que un valor absurdo (editado a mano) llegue a la
// pantalla de resultados.
const MAX_TIME_MS = 24 * 60 * 60 * 1000;

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isTime(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_TIME_MS
  );
}

function isResult(value: unknown): value is NodeLevelResult {
  if (typeof value !== "object" || value === null) return false;

  const r = value as Record<string, unknown>;

  return (
    isCount(r.level) &&
    isCount(r.pairCount) &&
    isTime(r.timeMs) &&
    isCount(r.undoCount) &&
    isCount(r.resetCount) &&
    (r.tryNumber === undefined || (isCount(r.tryNumber) && r.tryNumber >= 1)) &&
    (r.solved === undefined || typeof r.solved === "boolean") &&
    (r.passed === undefined || typeof r.passed === "boolean")
  );
}

/** Conserva solo los campos opcionales que vienen bien formados. */
function cleanResult(result: NodeLevelResult): NodeLevelResult {
  // Un resultado guardado antes de los errores permitidos solo existia si el
  // nivel se completo: fue el primer intento y se paso.
  const solved = result.solved ?? true;
  const clean: NodeLevelResult = {
    level: result.level,
    tryNumber: result.tryNumber ?? 1,
    solved,
    passed: result.passed ?? solved,
    pairCount: result.pairCount,
    timeMs: result.timeMs,
    undoCount: result.undoCount,
    resetCount: result.resetCount,
  };

  const net = optionalTimeMs(result.activeMsNet);
  const completedAt = optionalIsoDate(result.completedAt);
  const stats = cleanStats(result.stats);

  if (net !== undefined) clean.activeMsNet = net;
  if (completedAt !== undefined) clean.completedAt = completedAt;
  if (stats) clean.stats = stats;

  return clean;
}

function isSerializedPath(value: unknown): value is SerializedPath {
  if (typeof value !== "object" || value === null) return false;

  const p = value as Record<string, unknown>;

  return (
    typeof p.color === "string" &&
    COLOR_IDS.has(p.color) &&
    Array.isArray(p.cells) &&
    p.cells.every(
      (c) =>
        Array.isArray(c) &&
        c.length === 2 &&
        Number.isInteger(c[0]) &&
        Number.isInteger(c[1]),
    )
  );
}

export function serializePaths(paths: NodePaths): SerializedPath[] {
  const result: SerializedPath[] = [];

  for (const [color, cells] of Object.entries(paths)) {
    if (!cells || cells.length === 0) continue;

    result.push({
      color: color as NodeColorId,
      cells: cells.map((c): [number, number] => [c.row, c.col]),
    });
  }

  return result;
}

export function deserializePaths(serialized: SerializedPath[]): NodePaths {
  const paths: NodePaths = {};

  for (const { color, cells } of serialized) {
    paths[color] = cells.map((c): Cell => ({ row: c[0], col: c[1] }));
  }

  return paths;
}

/** Valida un blob guardado; devuelve null si algo no cuadra. */
export function parseNodeConnectionProgress(
  raw: unknown,
): NodeConnectionProgress | null {
  if (typeof raw !== "object" || raw === null) return null;

  const r = raw as Record<string, unknown>;

  if (r.version !== 1) return null;

  if (
    typeof r.phase !== "string" ||
    !SAVED_PHASES.includes(r.phase as NodeConnectionSavedPhase)
  ) {
    return null;
  }
  const phase = r.phase as NodeConnectionSavedPhase;

  if (
    typeof r.level !== "number" ||
    !Number.isInteger(r.level) ||
    r.level < 1 ||
    r.level > TOTAL_LEVELS
  ) {
    return null;
  }
  const level = r.level;
  const levelData = LEVELS[level - 1];
  if (!levelData) return null;

  if (!Array.isArray(r.results) || !r.results.every(isResult)) return null;
  const results = (r.results as NodeLevelResult[]).map(cleanResult);

  // Cada resultado debe ser el nivel e intento que correspondia por posicion.
  const flow = replayFlow(results);
  if (!flow.ok) return null;

  for (const result of results) {
    const expected = LEVELS[result.level - 1];

    if (!expected || result.pairCount !== expected.pairs.length) return null;
    // Un intento pasado es un tablero resuelto.
    if (result.passed && !result.solved) return null;
  }

  const last = results[results.length - 1];
  const tryNumber = r.tryNumber === undefined ? 1 : r.tryNumber;

  if (!isCount(tryNumber) || tryNumber < 1) return null;

  if (phase === "playing") {
    // Toca jugar justo lo que sigue a los resultados.
    if (flow.terminal !== null) return null;
    if (flow.level !== level || flow.tryNumber !== tryNumber) return null;
  } else if (phase === "level-complete") {
    if (!last?.passed || last.level !== level || last.tryNumber !== tryNumber) {
      return null;
    }
    if (flow.terminal !== null && flow.terminal !== "complete") return null;
  } else if (phase === "level-failed") {
    if (!last || last.passed || last.level !== level || last.tryNumber !== tryNumber) {
      return null;
    }
    if (flow.terminal !== null) return null;
  } else if (phase === "finished") {
    if (!last || (flow.terminal !== "complete" && flow.terminal !== "close")) {
      return null;
    }
    if (last.level !== level || last.tryNumber !== tryNumber) return null;
  } else {
    if (!last || flow.terminal !== "restart") return null;
    if (last.level !== level || last.tryNumber !== tryNumber) return null;
  }

  if (!isCount(r.undoCount) || !isCount(r.resetCount) || !isTime(r.elapsedMs)) {
    return null;
  }

  if (!Array.isArray(r.paths) || !r.paths.every(isSerializedPath)) return null;
  const paths = r.paths as SerializedPath[];

  if (phase === "playing") {
    const colors = paths.map((p) => p.color);
    if (new Set(colors).size !== colors.length) return null;

    if (!arePathsValid(levelData, deserializePaths(paths))) return null;
  } else if (paths.length > 0) {
    return null;
  }

  const netMs = optionalTimeMs(r.netMs);
  const stats = cleanStats(r.stats);
  const attempt = parseAttemptHandle(r.attempt);
  const events = phase === "playing" ? cleanNodeEvents(r.events) : [];
  const eventsDropped = phase === "playing" ? cleanDroppedCount(r.eventsDropped) : 0;

  return {
    version: 1,
    phase,
    level,
    tryNumber,
    paths,
    elapsedMs: r.elapsedMs,
    undoCount: r.undoCount,
    resetCount: r.resetCount,
    // Un neto mayor que el bruto no puede ser cierto: se ignora.
    ...(netMs !== undefined && netMs <= r.elapsedMs ? { netMs } : {}),
    ...(stats ? { stats } : {}),
    ...(events.length > 0 ? { events } : {}),
    ...(eventsDropped > 0 ? { eventsDropped } : {}),
    results,
    ...(attempt ? { attempt } : {}),
  };
}

export function buildNodeConnectionSnapshot(input: {
  phase: NodeConnectionSavedPhase;
  level: number;
  tryNumber?: number;
  paths: NodePaths;
  elapsedMs: number;
  undoCount: number;
  resetCount: number;
  netMs?: number;
  stats?: NodeStats;
  events?: NodeEvent[];
  eventsDropped?: number;
  results: NodeLevelResult[];
  attempt?: AttemptHandle;
}): NodeConnectionProgress {
  const keepPaths = input.phase === "playing";

  return {
    version: 1,
    phase: input.phase,
    level: input.level,
    tryNumber: input.tryNumber ?? 1,
    paths: keepPaths ? serializePaths(input.paths) : [],
    elapsedMs: keepPaths ? Math.round(input.elapsedMs) : 0,
    undoCount: keepPaths ? input.undoCount : 0,
    resetCount: keepPaths ? input.resetCount : 0,
    ...(keepPaths && input.netMs !== undefined
      ? { netMs: Math.round(input.netMs) }
      : {}),
    ...(keepPaths && input.stats ? { stats: input.stats } : {}),
    ...(keepPaths && input.events && input.events.length > 0
      ? { events: input.events }
      : {}),
    ...(keepPaths && input.eventsDropped ? { eventsDropped: input.eventsDropped } : {}),
    // La bitacora de un nivel terminado ya salio hacia la base: no se repite
    // en cada guardado (pesaria cada vez mas).
    results: input.results.map(withoutEvents),
    ...(input.attempt ? { attempt: input.attempt } : {}),
  };
}

function withoutEvents(result: NodeLevelResult): NodeLevelResult {
  const { events: _events, eventsDropped: _dropped, ...rest } = result;

  return rest;
}

/** True si el blob guardado corresponde a un tablero ya resuelto. */
export function isSnapshotSolved(snapshot: NodeConnectionProgress): boolean {
  const level = LEVELS[snapshot.level - 1];

  return (
    snapshot.phase === "playing" &&
    level !== undefined &&
    isSolved(level, deserializePaths(snapshot.paths))
  );
}
