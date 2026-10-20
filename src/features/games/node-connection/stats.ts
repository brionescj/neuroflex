import { endpointColorAt, sameCell } from "./board";
import type { NodeLevel, NodePaths, NodeStats } from "./types";

const STAT_KEYS: (keyof NodeStats)[] = [
  "strokesStarted",
  "backtrackCells",
  "backtrackGestures",
  "routeRestarts",
  "restartCells",
  "resetCells",
  "blockedCount",
];

const MAX_COUNT = 1_000_000;

export function emptyStats(): NodeStats {
  return {
    strokesStarted: 0,
    backtrackCells: 0,
    backtrackGestures: 0,
    routeRestarts: 0,
    restartCells: 0,
    resetCells: 0,
    blockedCount: 0,
  };
}

/**
 * Celdas dibujadas que estaban en `before` y ya no estan en `after`. Los
 * nodos de color no cuentan: no los dibuja el jugador.
 */
export function removedCells(
  level: NodeLevel,
  before: NodePaths,
  after: NodePaths,
): number {
  let removed = 0;

  for (const [color, cells] of Object.entries(before)) {
    const kept = after[color as keyof NodePaths] ?? [];

    for (const cell of cells ?? []) {
      if (endpointColorAt(level, cell)) continue;
      if (!kept.some((c) => sameCell(c, cell))) removed++;
    }
  }

  return removed;
}

/** Valida contadores que vienen de un avance guardado; null si algo no cuadra. */
export function cleanStats(raw: unknown): NodeStats | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;

  const r = raw as Record<string, unknown>;
  const stats = emptyStats();

  for (const key of STAT_KEYS) {
    const value = r[key];

    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > MAX_COUNT
    ) {
      return undefined;
    }

    stats[key] = value;
  }

  return stats;
}

/** Celdas borradas por cualquier motivo (retroceder, rehacer una ruta, rehacer el tablero). */
export function cellsErased(stats: NodeStats): number {
  return stats.backtrackCells + stats.restartCells + stats.resetCells;
}

/**
 * Correcciones: cada vez que el jugador deshizo algo, rehizo una ruta,
 * retrocedio sobre su trazo o rehizo el tablero. Sin los contadores nuevos
 * (partida antigua) solo se conocen deshacer y rehacer el tablero.
 */
export function corrections(result: {
  undoCount: number;
  resetCount: number;
  stats?: NodeStats;
}): number {
  const base = result.undoCount + result.resetCount;

  if (!result.stats) return base;

  return base + result.stats.routeRestarts + result.stats.backtrackGestures;
}
