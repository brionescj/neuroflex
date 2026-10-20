import type { LevelReport } from "../attempts/types";
import type { LevelResult } from "./colorSequenceConfig";
import { passThresholdPercent } from "./colorSequenceRules";

/**
 * Identificador del resultado dentro de la partida. El primer intento de un
 * nivel conserva la clave de siempre ("3"), de modo que lo guardado antes de
 * existir los reintentos sigue siendo valido; los demas llevan el intento.
 */
export function colorSequenceResultKey(level: number, tryNumber: number): string {
  return tryNumber <= 1 ? String(level) : `${level}.${tryNumber}`;
}

/**
 * Convierte el resultado de un intento de nivel al formato del registro de
 * partidas. Un resultado guardado antes de existir el registro no trae
 * tiempos activos ni fecha: se usa el tiempo de respuesta y `fallbackDate`.
 */
export function toColorSequenceReport(
  result: LevelResult,
  fallbackDate: string,
): LevelReport {
  const gross = result.activeMsGross ?? result.timeMs;
  const net = Math.min(result.activeMsNet ?? gross, gross);

  return {
    key: colorSequenceResultKey(result.level, result.tryNumber),
    index: result.level,
    tryNumber: result.tryNumber,
    metrics: {
      sequenceLength: result.sequenceLength,
      correctCount: result.correctCount,
      percent: Math.round((result.correctCount / result.sequenceLength) * 100),
      thresholdPercent: passThresholdPercent(result.level),
      passed: result.passed,
      timeMs: result.timeMs,
    },
    activeMsGross: gross,
    activeMsNet: net,
    completedAt: result.completedAt ?? fallbackDate,
  };
}
