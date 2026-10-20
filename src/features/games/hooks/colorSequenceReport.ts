import type { LevelReport } from "../attempts/types";
import type { LevelResult } from "./colorSequenceConfig";

/**
 * Convierte el resultado de un nivel al formato del registro de partidas.
 * Un resultado guardado antes de existir el registro no trae tiempos
 * activos ni fecha: se usa el tiempo de respuesta y `fallbackDate`.
 */
export function toColorSequenceReport(
  result: LevelResult,
  fallbackDate: string,
): LevelReport {
  const gross = result.activeMsGross ?? result.timeMs;
  const net = Math.min(result.activeMsNet ?? gross, gross);

  return {
    key: String(result.level),
    index: result.level,
    tryNumber: 1,
    metrics: {
      sequenceLength: result.sequenceLength,
      correctCount: result.correctCount,
      percent: Math.round((result.correctCount / result.sequenceLength) * 100),
      timeMs: result.timeMs,
    },
    activeMsGross: gross,
    activeMsNet: net,
    completedAt: result.completedAt ?? fallbackDate,
  };
}
