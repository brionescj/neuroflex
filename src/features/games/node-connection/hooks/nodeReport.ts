import { LEVELS } from "../levels";
import type { LevelReport } from "../../attempts/types";
import { cellsErased, corrections } from "../stats";
import type { NodeLevelResult } from "../types";

/**
 * Convierte el resultado de un nivel al formato del registro de partidas.
 * Si falta el tiempo neto (partida guardada antes del registro) se usa el
 * tiempo activo, y si falta la fecha, `fallbackDate`.
 */
export function toNodeReport(
  result: NodeLevelResult,
  fallbackDate: string,
): LevelReport {
  const level = LEVELS[result.level - 1];
  const net = Math.min(result.activeMsNet ?? result.timeMs, result.timeMs);

  return {
    key: String(result.level),
    index: result.level,
    tryNumber: 1,
    metrics: {
      pairCount: result.pairCount,
      boardSize: level ? level.rows : 0,
      undoCount: result.undoCount,
      resetCount: result.resetCount,
      corrections: corrections(result),
      // Sin contadores (partida anterior a registrarlos) no se inventan ceros.
      ...(result.stats
        ? { ...result.stats, cellsErased: cellsErased(result.stats) }
        : {}),
    },
    activeMsGross: result.timeMs,
    activeMsNet: net,
    completedAt: result.completedAt ?? fallbackDate,
  };
}

/**
 * Cambia cuando cambian los tableros: sin ella no se pueden comparar
 * partidas jugadas con tableros distintos.
 */
export function nodeContentVersion(): string {
  const text = JSON.stringify(
    LEVELS.map((l) => [l.rows, l.cols, l.pairs.map((p) => [p.color, p.a, p.b])]),
  );

  // FNV-1a de 32 bits: suficiente para distinguir versiones.
  let hash = 0x811c9dc5;

  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `nodes-${LEVELS.length}-${hash.toString(16)}`;
}
