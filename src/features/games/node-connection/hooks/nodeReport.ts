import { LEVELS } from "../levels";
import type { LevelReport, MetricValue } from "../../attempts/types";
import { allowedErrors, errorsOf, nodeResultKey } from "../rules";
import { cellsErased, corrections } from "../stats";
import type { NodeEvent, NodeLevelResult } from "../types";

/** Un evento como objeto JSON simple (sin campos indefinidos). */
function eventRecord(event: NodeEvent): Record<string, MetricValue> {
  const record: Record<string, MetricValue> = {};

  for (const [key, value] of Object.entries(event)) {
    if (value !== undefined) record[key] = value;
  }

  return record;
}

/**
 * Convierte el resultado de un intento de nivel al formato del registro de partidas.
 * Si falta el tiempo neto (partida guardada antes del registro) se usa el
 * tiempo activo, y si falta la fecha, `fallbackDate`.
 */
export function toNodeReport(
  result: NodeLevelResult,
  fallbackDate: string,
): LevelReport {
  const level = LEVELS[result.level - 1];
  const net = Math.min(result.activeMsNet ?? result.timeMs, result.timeMs);
  const hasEvents = (result.events?.length ?? 0) > 0;

  return {
    key: nodeResultKey(result.level, result.tryNumber),
    index: result.level,
    tryNumber: result.tryNumber,
    metrics: {
      solved: result.solved,
      passed: result.passed,
      // Sin contadores (partida anterior a registrarlos) no se inventan errores.
      ...(result.stats
        ? {
            errors: errorsOf({
              blockedCount: result.stats.blockedCount,
              resetCount: result.resetCount,
            }),
            errorsAllowed: allowedErrors(result.level, result.pairCount),
          }
        : {}),
      pairCount: result.pairCount,
      boardSize: level ? level.rows : 0,
      undoCount: result.undoCount,
      resetCount: result.resetCount,
      corrections: corrections(result),
      // Sin contadores (partida anterior a registrarlos) no se inventan ceros.
      ...(result.stats
        ? { ...result.stats, cellsErased: cellsErased(result.stats) }
        : {}),
      // Si la bitacora quedo incompleta por el tope, el servidor lo sabe.
      ...(hasEvents ? { eventsDropped: result.eventsDropped ?? 0 } : {}),
    },
    activeMsGross: result.timeMs,
    activeMsNet: net,
    completedAt: result.completedAt ?? fallbackDate,
    ...(hasEvents ? { events: (result.events ?? []).map(eventRecord) } : {}),
  };
}

/**
 * Revision de las reglas de aprobacion. Sube si cambian los errores permitidos
 * o los intentos: una partida jugada sin errores permitidos ("r1", la unica
 * hasta entonces) no se puede comparar con una jugada con ellos.
 */
const RULES_REVISION = 3;

/**
 * Cambia cuando cambian los tableros o las reglas: sin ella no se pueden
 * comparar partidas jugadas con tableros o reglas distintos.
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

  return `nodes-${LEVELS.length}-${hash.toString(16)}-r${RULES_REVISION}`;
}
