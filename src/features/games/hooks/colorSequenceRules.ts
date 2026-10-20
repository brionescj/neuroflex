import { MIN_LEVELS, MIN_SEQUENCE_LENGTH } from "./colorSequenceConfig";

/**
 * Reglas de aprobacion de Seriacion de colores. Son funciones puras: las usan
 * el juego, la validacion del avance guardado y los tests. El servidor tiene
 * su propia copia en lib/gameAttempts.ts (no comparte codigo con el navegador);
 * lib/colorSequenceRulesParity.test.ts comprueba que ambas den lo mismo.
 */

/** Intentos por nivel. Cada reintento es una secuencia nueva del mismo largo. */
export const MAX_TRIES_PER_LEVEL = 3;

/** Largo de la secuencia de un nivel (el nivel 1 tiene 2 colores). */
export function sequenceLengthOf(level: number): number {
  return MIN_SEQUENCE_LENGTH + level - 1;
}

/** Porcentaje de aciertos que se exige para pasar el nivel. */
export function passThresholdPercent(level: number): number {
  if (level <= 5) return 60;
  if (level <= 8) return 70;
  if (level <= 10) return 90;

  return 75;
}

/**
 * Aciertos minimos para pasar. Se calcula con enteros (nada de 0.6 * 5, que en
 * punto flotante puede dar 3.0000000000000004 y exigir un acierto de mas).
 */
export function requiredCorrect(level: number, sequenceLength: number): number {
  return Math.ceil((sequenceLength * passThresholdPercent(level)) / 100);
}

export function isLevelPassed(
  level: number,
  sequenceLength: number,
  correctCount: number,
): boolean {
  return correctCount * 100 >= passThresholdPercent(level) * sequenceLength;
}

/** Lo minimo del resultado de un intento de nivel que necesitan las reglas. */
export type TryOutcome = {
  level: number;
  tryNumber: number;
  passed: boolean;
};

/**
 * Que pasa despues de resolver un intento:
 * - "next-level": lo paso, sigue el nivel siguiente.
 * - "retry": no lo paso y le quedan intentos en este nivel.
 * - "restart": agoto los intentos en un nivel obligatorio (1 a 10): la partida
 *   termina como fallida y, si juega de nuevo, empieza desde el nivel 1.
 * - "close": agoto los intentos desde el nivel 11: la partida termina con el
 *   nivel maximo que alcanzo a pasar.
 */
export type NextStep = "next-level" | "retry" | "restart" | "close";

export function nextStepAfter(outcome: TryOutcome): NextStep {
  if (outcome.passed) return "next-level";
  if (outcome.tryNumber < MAX_TRIES_PER_LEVEL) return "retry";

  return outcome.level <= MIN_LEVELS ? "restart" : "close";
}

export type ReplayedFlow =
  | {
      ok: true;
      /** Nivel e intento que toca jugar a continuacion (si la partida sigue). */
      level: number;
      tryNumber: number;
      /** La partida ya no puede continuar: terminal por intentos agotados. */
      terminal: "restart" | "close" | null;
      maxLevelPassed: number;
    }
  | { ok: false };

/**
 * Recorre los resultados en orden y comprueba que cuenten una partida posible
 * (cada uno es el nivel/intento que correspondia). Devuelve a donde llegaria.
 */
export function replayFlow(results: TryOutcome[]): ReplayedFlow {
  let level = 1;
  let tryNumber = 1;
  let maxLevelPassed = 0;
  let terminal: "restart" | "close" | null = null;

  for (const result of results) {
    if (terminal !== null) return { ok: false };
    if (result.level !== level || result.tryNumber !== tryNumber) {
      return { ok: false };
    }

    const step = nextStepAfter(result);

    if (step === "next-level") {
      maxLevelPassed = Math.max(maxLevelPassed, result.level);
      level += 1;
      tryNumber = 1;
    } else if (step === "retry") {
      tryNumber += 1;
    } else {
      terminal = step;
    }
  }

  return { ok: true, level, tryNumber, terminal, maxLevelPassed };
}
