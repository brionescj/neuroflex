import { arePathsValid, isSolved } from "./board";
import { NODE_COLORS } from "./colors";
import { LEVELS, TOTAL_LEVELS } from "./levels";
import type {
  Cell,
  NodeColorId,
  NodeLevelResult,
  NodePaths,
} from "./types";

export type NodeConnectionSavedPhase = "playing" | "level-complete" | "finished";

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
  /** Trazos del nivel en curso. Vacio fuera de "playing". */
  paths: SerializedPath[];
  elapsedMs: number;
  undoCount: number;
  resetCount: number;
  results: NodeLevelResult[];
};

const SAVED_PHASES: NodeConnectionSavedPhase[] = [
  "playing",
  "level-complete",
  "finished",
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
    isCount(r.resetCount)
  );
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
  const results = r.results as NodeLevelResult[];

  const expectedResults = phase === "playing" ? level - 1 : level;
  if (results.length !== expectedResults) return null;

  if (phase === "finished" && level !== TOTAL_LEVELS) return null;

  // Cada resultado debe ser del nivel que le corresponde por posicion.
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const expected = LEVELS[i];

    if (
      !result ||
      !expected ||
      result.level !== i + 1 ||
      result.pairCount !== expected.pairs.length
    ) {
      return null;
    }
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

  return {
    version: 1,
    phase,
    level,
    paths,
    elapsedMs: r.elapsedMs,
    undoCount: r.undoCount,
    resetCount: r.resetCount,
    results,
  };
}

export function buildNodeConnectionSnapshot(input: {
  phase: NodeConnectionSavedPhase;
  level: number;
  paths: NodePaths;
  elapsedMs: number;
  undoCount: number;
  resetCount: number;
  results: NodeLevelResult[];
}): NodeConnectionProgress {
  const keepPaths = input.phase === "playing";

  return {
    version: 1,
    phase: input.phase,
    level: input.level,
    paths: keepPaths ? serializePaths(input.paths) : [],
    elapsedMs: keepPaths ? Math.round(input.elapsedMs) : 0,
    undoCount: keepPaths ? input.undoCount : 0,
    resetCount: keepPaths ? input.resetCount : 0,
    results: input.results,
  };
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
