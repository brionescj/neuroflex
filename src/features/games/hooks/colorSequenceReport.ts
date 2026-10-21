import type { LevelReport } from "../attempts/types";
import type {
  ColorTap,
  LevelResult,
  SequenceColorId,
} from "./colorSequenceConfig";
import { passThresholdPercent } from "./colorSequenceRules";

/**
 * Identificador del resultado dentro de la partida. El primer intento de un
 * nivel conserva la clave de siempre ("3"), de modo que lo guardado antes de
 * existir los reintentos sigue siendo valido; los demas llevan el intento.
 */
export function colorSequenceResultKey(level: number, tryNumber: number): string {
  return tryNumber <= 1 ? String(level) : `${level}.${tryNumber}`;
}

type WithFineEvents = LevelResult & { shown: SequenceColorId[]; taps: ColorTap[] };

/** Tiene la secuencia mostrada y un toque por color (si no, no se informan). */
function hasFineEvents(result: LevelResult): result is WithFineEvents {
  return (
    result.shown !== undefined &&
    result.taps !== undefined &&
    result.shown.length === result.sequenceLength &&
    result.taps.length === result.sequenceLength
  );
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
  const hasTaps = hasFineEvents(result);

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
      // La secuencia y el inicio de la respuesta explican los toques; sin
      // ellos (partida anterior al registro) no se inventan.
      ...(hasTaps
        ? { shownSequence: [...result.shown], illuminationMs: result.illuminationMs ?? 0 }
        : {}),
    },
    activeMsGross: gross,
    activeMsNet: net,
    completedAt: result.completedAt ?? fallbackDate,
    ...(hasTaps ? { events: result.taps.map((tap) => ({ c: tap.c, t: tap.t })) } : {}),
  };
}
