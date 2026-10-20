import { SEQUENCE_COLORS, type SequenceColorId } from "../components/ColorGrid";
import {
  optionalIsoDate,
  optionalTimeMs,
  parseAttemptHandle,
} from "../attempts/attemptHandle";
import type { AttemptHandle } from "../attempts/types";
import {
  MAX_SAVED_LEVEL,
  MIN_LEVELS,
  MIN_SEQUENCE_LENGTH,
  type LevelResult,
} from "./colorSequenceConfig";

export type ColorSequenceSavedPhase =
  | "illuminating"
  | "level-result"
  | "finished";

/**
 * Avance guardado de Seriacion de colores. Se guarda al inicio de cada
 * nivel, con su resultado, y al final. Reanudar un nivel a medias vuelve a
 * iluminar la MISMA secuencia desde el principio. Al terminar el juego,
 * `level` es el ultimo completado o el que quedo a medias.
 */
export type ColorSequenceProgress = {
  version: 1;
  phase: ColorSequenceSavedPhase;
  level: number;
  sequence: SequenceColorId[];
  levelResults: LevelResult[];
  /** Partida a la que pertenece (ausente en avances anteriores al registro). */
  attempt?: AttemptHandle;
};

const SAVED_PHASES: ColorSequenceSavedPhase[] = [
  "illuminating",
  "level-result",
  "finished",
];

const COLOR_IDS = new Set<string>(SEQUENCE_COLORS.map((c) => c.id));

function isLevelResult(value: unknown): value is LevelResult {
  if (typeof value !== "object" || value === null) return false;

  const r = value as Record<string, unknown>;

  return (
    typeof r.level === "number" &&
    typeof r.sequenceLength === "number" &&
    typeof r.correctCount === "number" &&
    typeof r.timeMs === "number"
  );
}

/** Conserva solo los campos opcionales que vienen bien formados. */
function cleanLevelResult(result: LevelResult): LevelResult {
  const clean: LevelResult = {
    level: result.level,
    sequenceLength: result.sequenceLength,
    correctCount: result.correctCount,
    timeMs: result.timeMs,
  };

  const gross = optionalTimeMs(result.activeMsGross);
  const net = optionalTimeMs(result.activeMsNet);
  const completedAt = optionalIsoDate(result.completedAt);

  if (gross !== undefined) clean.activeMsGross = gross;
  if (net !== undefined) clean.activeMsNet = net;
  if (completedAt !== undefined) clean.completedAt = completedAt;

  return clean;
}

/** Valida un blob guardado; devuelve null si algo no cuadra. */
export function parseColorSequenceProgress(
  raw: unknown,
): ColorSequenceProgress | null {
  if (typeof raw !== "object" || raw === null) return null;

  const r = raw as Record<string, unknown>;

  if (r.version !== 1) return null;

  if (
    typeof r.phase !== "string" ||
    !SAVED_PHASES.includes(r.phase as ColorSequenceSavedPhase)
  ) {
    return null;
  }
  const phase = r.phase as ColorSequenceSavedPhase;

  if (
    typeof r.level !== "number" ||
    !Number.isInteger(r.level) ||
    r.level < 1 ||
    r.level > MAX_SAVED_LEVEL
  ) {
    return null;
  }
  const level = r.level;

  if (
    !Array.isArray(r.sequence) ||
    !r.sequence.every((c) => typeof c === "string" && COLOR_IDS.has(c)) ||
    r.sequence.length !== MIN_SEQUENCE_LENGTH + level - 1
  ) {
    return null;
  }
  const sequence = r.sequence as SequenceColorId[];

  if (!Array.isArray(r.levelResults) || !r.levelResults.every(isLevelResult)) {
    return null;
  }
  const levelResults = (r.levelResults as LevelResult[]).map(cleanLevelResult);

  if (phase === "finished") {
    // Se puede terminar el juego tras un nivel completado o a mitad del
    // siguiente (ese no cuenta): siempre con el minimo de niveles hecho.
    if (levelResults.length < MIN_LEVELS) return null;
    if (level !== levelResults.length && level !== levelResults.length + 1) {
      return null;
    }
  } else {
    const expectedResults = phase === "illuminating" ? level - 1 : level;
    if (levelResults.length !== expectedResults) return null;
  }

  // Cada resultado debe ser del nivel que le corresponde por posicion.
  for (let i = 0; i < levelResults.length; i++) {
    const result = levelResults[i];
    if (
      result?.level !== i + 1 ||
      result.sequenceLength !== MIN_SEQUENCE_LENGTH + i
    ) {
      return null;
    }
  }

  const attempt = parseAttemptHandle(r.attempt);

  return {
    version: 1,
    phase,
    level,
    sequence,
    levelResults,
    ...(attempt ? { attempt } : {}),
  };
}

export function buildColorSequenceSnapshot(
  phase: ColorSequenceSavedPhase,
  level: number,
  sequence: SequenceColorId[],
  levelResults: LevelResult[],
  attempt?: AttemptHandle,
): ColorSequenceProgress {
  return {
    version: 1,
    phase,
    level,
    sequence,
    levelResults,
    ...(attempt ? { attempt } : {}),
  };
}
