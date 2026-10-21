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
  type ColorTap,
  type LevelResult,
} from "./colorSequenceConfig";
import {
  MAX_TRIES_PER_LEVEL,
  isLevelPassed,
  replayFlow,
  sequenceLengthOf,
} from "./colorSequenceRules";

/**
 * - "finished": la partida termino (voluntariamente desde el nivel 11, o al
 *   agotar los intentos de un nivel desde el 11).
 * - "failed": agoto los intentos de un nivel obligatorio (1 a 10).
 * Ambas son definitivas: al volver a entrar se archivan y se ofrece una nueva.
 */
export type ColorSequenceSavedPhase =
  | "illuminating"
  | "level-result"
  | "finished"
  | "failed";

/**
 * Avance guardado de Seriacion de colores. Se guarda al inicio de cada
 * intento de nivel, con su resultado, y al final. Reanudar un intento a medias
 * vuelve a iluminar la MISMA secuencia desde el principio. `levelResults`
 * trae todos los intentos, pasados o no. Al terminar el juego, `level` y
 * `tryNumber` son los del ultimo intento jugado o el que quedo a medias.
 */
export type ColorSequenceProgress = {
  version: 2;
  phase: ColorSequenceSavedPhase;
  level: number;
  /** Intento dentro del nivel (1 a 3). */
  tryNumber: number;
  sequence: SequenceColorId[];
  levelResults: LevelResult[];
  /** Partida a la que pertenece (ausente en avances anteriores al registro). */
  attempt?: AttemptHandle;
};

const SAVED_PHASES: ColorSequenceSavedPhase[] = [
  "illuminating",
  "level-result",
  "finished",
  "failed",
];

const COLOR_IDS = new Set<string>(SEQUENCE_COLORS.map((c) => c.id));

/** Lo que trae un resultado guardado: los campos de los reintentos pueden faltar. */
type RawLevelResult = Omit<
  LevelResult,
  "tryNumber" | "passed" | "shown" | "taps" | "illuminationMs"
> & {
  tryNumber?: unknown;
  passed?: unknown;
  shown?: unknown;
  taps?: unknown;
  illuminationMs?: unknown;
};

function isLevelResult(value: unknown): value is RawLevelResult {
  if (typeof value !== "object" || value === null) return false;

  const r = value as Record<string, unknown>;

  return (
    typeof r.level === "number" &&
    typeof r.sequenceLength === "number" &&
    typeof r.correctCount === "number" &&
    typeof r.timeMs === "number"
  );
}

function isTryNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_TRIES_PER_LEVEL
  );
}

/**
 * Conserva solo los campos que vienen bien formados. Un avance de antes de los
 * reintentos (version 1) no trae intento: todo nivel guardado se paso, era la
 * unica forma de seguir jugando. En la version 2 `passed` se recalcula con las
 * reglas: no se confia en lo que diga el avance.
 */
function cleanLevelResult(
  result: RawLevelResult,
  tryNumber: number,
  legacy: boolean,
): LevelResult {
  const clean: LevelResult = {
    level: result.level,
    tryNumber,
    passed: legacy
      ? true
      : isLevelPassed(result.level, result.sequenceLength, result.correctCount),
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

  // Secuencia, inicio de la respuesta y toques van juntos: si algo no cuadra
  // se descartan los tres y el nivel se conserva como si no los tuviera.
  const shown = cleanColors(result.shown, result.sequenceLength);
  const taps = cleanTaps(result.taps, result.sequenceLength);
  const illumination = optionalTimeMs(result.illuminationMs);

  if (shown && taps && illumination !== undefined) {
    clean.shown = shown;
    clean.taps = taps;
    clean.illuminationMs = illumination;
  }

  return clean;
}

function cleanColors(raw: unknown, length: number): SequenceColorId[] | undefined {
  return Array.isArray(raw) &&
    raw.length === length &&
    raw.every((c) => typeof c === "string" && COLOR_IDS.has(c))
    ? (raw as SequenceColorId[])
    : undefined;
}

function cleanTaps(raw: unknown, length: number): ColorTap[] | undefined {
  if (!Array.isArray(raw) || raw.length !== length) return undefined;

  const taps: ColorTap[] = [];
  let previous = 0;

  for (const item of raw) {
    if (typeof item !== "object" || item === null) return undefined;

    const { c, t } = item as Record<string, unknown>;
    const time = optionalTimeMs(t);

    if (
      typeof c !== "string" ||
      !COLOR_IDS.has(c) ||
      time === undefined ||
      time < previous
    ) {
      return undefined;
    }

    previous = time;
    taps.push({ c: c as SequenceColorId, t: time });
  }

  return taps;
}

/** Valida un blob guardado; devuelve null si algo no cuadra. */
export function parseColorSequenceProgress(
  raw: unknown,
): ColorSequenceProgress | null {
  if (typeof raw !== "object" || raw === null) return null;

  const r = raw as Record<string, unknown>;

  if (r.version !== 1 && r.version !== 2) return null;
  const legacy = r.version === 1;

  if (
    typeof r.phase !== "string" ||
    !SAVED_PHASES.includes(r.phase as ColorSequenceSavedPhase)
  ) {
    return null;
  }
  const phase = r.phase as ColorSequenceSavedPhase;

  // Antes de los reintentos no existia la fase "failed".
  if (legacy && phase === "failed") return null;

  if (
    typeof r.level !== "number" ||
    !Number.isInteger(r.level) ||
    r.level < 1 ||
    r.level > MAX_SAVED_LEVEL
  ) {
    return null;
  }
  const level = r.level;

  if (!legacy && !isTryNumber(r.tryNumber)) return null;
  const tryNumber = legacy ? 1 : (r.tryNumber as number);

  if (
    !Array.isArray(r.sequence) ||
    !r.sequence.every((c) => typeof c === "string" && COLOR_IDS.has(c)) ||
    r.sequence.length !== sequenceLengthOf(level)
  ) {
    return null;
  }
  const sequence = r.sequence as SequenceColorId[];

  if (!Array.isArray(r.levelResults) || !r.levelResults.every(isLevelResult)) {
    return null;
  }
  const rawResults = r.levelResults as RawLevelResult[];

  if (!legacy && !rawResults.every((x) => isTryNumber(x.tryNumber))) {
    return null;
  }

  // En la version 1 hay un resultado por nivel: su intento es el 1.
  const levelResults = rawResults.map((x) =>
    cleanLevelResult(x, legacy ? 1 : (x.tryNumber as number), legacy),
  );

  // Cada resultado debe ser el intento que correspondia por posicion y traer
  // el largo de secuencia de su nivel.
  const flow = replayFlow(levelResults);
  if (!flow.ok) return null;

  if (levelResults.some((x) => x.sequenceLength !== sequenceLengthOf(x.level))) {
    return null;
  }

  const last = levelResults[levelResults.length - 1];
  const atLastResult =
    last !== undefined && level === last.level && tryNumber === last.tryNumber;

  if (phase === "illuminating") {
    // A mitad de un intento: toca justo el nivel/intento que sigue.
    if (flow.terminal !== null) return null;
    if (level !== flow.level || tryNumber !== flow.tryNumber) return null;
  } else if (phase === "level-result") {
    // Mostrando el resultado del ultimo intento, y la partida sigue.
    if (flow.terminal !== null || !atLastResult) return null;
  } else if (phase === "failed") {
    // Agoto los intentos de un nivel obligatorio.
    if (flow.terminal !== "restart" || !atLastResult) return null;
  } else {
    // "finished": agoto intentos desde el nivel 11, o el alumno decidio
    // terminar (posible solo con los niveles obligatorios pasados). Puede
    // terminar tras un resultado o a mitad del intento siguiente.
    if (flow.terminal === "restart") return null;
    if (flow.maxLevelPassed < MIN_LEVELS) return null;

    const atNext =
      flow.terminal === null &&
      level === flow.level &&
      tryNumber === flow.tryNumber;

    if (!atLastResult && !atNext) return null;
  }

  const attempt = parseAttemptHandle(r.attempt);

  return {
    version: 2,
    phase,
    level,
    tryNumber,
    sequence,
    levelResults,
    ...(attempt ? { attempt } : {}),
  };
}

export function buildColorSequenceSnapshot(
  phase: ColorSequenceSavedPhase,
  level: number,
  tryNumber: number,
  sequence: SequenceColorId[],
  levelResults: LevelResult[],
  attempt?: AttemptHandle,
): ColorSequenceProgress {
  return {
    version: 2,
    phase,
    level,
    tryNumber,
    sequence,
    levelResults,
    ...(attempt ? { attempt } : {}),
  };
}
