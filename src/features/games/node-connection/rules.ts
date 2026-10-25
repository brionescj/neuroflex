import { TOTAL_LEVELS } from "./levels";

/**
 * Reglas de aprobacion de Conexion de nodos. Son funciones puras: las usan el
 * juego, la validacion del avance guardado y los tests. El servidor tiene su
 * propia copia en lib/nodeRules.ts (no comparte codigo con el navegador);
 * lib/nodeRulesParity.test.ts comprueba que ambas den lo mismo.
 *
 * Un nivel se pasa conectando todos los pares SIN agotar los errores que se
 * permiten. Los errores son todo lo que obliga a corregir una ruta ya trazada:
 * - cada choque: el trazo intento pasar por una celda ocupada (`blockedCount`);
 * - cada "Deshacer" (`undoCount`);
 * - cada vez que se acorta o rehace una ruta tocandola otra vez (`routeRestarts`);
 * - cada gesto que retrocede sobre el propio trazo (`backtrackGestures`): un gesto
 *   es apoyar y soltar el dedo, aunque borre varias celdas;
 * - cada "Rehacer tablero", que vale doble (`RESET_ERROR_WEIGHT`).
 * La idea es que haya que planificar la ruta ANTES de trazarla: corregir sobre la
 * marcha tambien cuesta.
 */

/** Intentos por nivel. Cada reintento es el mismo tablero, con los errores en cero. */
export const MAX_TRIES_PER_LEVEL = 3;

/** Niveles obligatorios: si se agotan los intentos en uno de estos, la partida se pierde. */
export const MIN_LEVELS = 10;

/** Un "Rehacer tablero" cuesta lo mismo que dos choques: tirar toda la ruta es un plan que fallo. */
export const RESET_ERROR_WEIGHT = 2;

/** Los errores permitidos nunca bajan de esta cantidad, ni en el tablero mas chico. */
export const MIN_ALLOWED_ERRORS = 4;

/**
 * Errores que se permiten, como porcentaje de los pares del tablero, segun el tramo del
 * juego: 100 % (1 a 5), 80 % (6 a 10) y 60 % (11 a 15). Es un margen estrecho a proposito:
 * como deshacer, retroceder y rehacer rutas tambien cuentan, hay que planificar antes de trazar.
 * Se calibro con jugadores simulados (no con estudiantes): conviene revisarlo con datos reales.
 */
export function allowedPercentOfPairs(level: number): number {
  if (level <= 5) return 100;
  if (level <= 10) return 80;

  return 60;
}

/**
 * Errores que se permiten en el nivel: el porcentaje de los pares, redondeado hacia arriba (con
 * enteros, sin decimales que se desvien) y nunca menos de `MIN_ALLOWED_ERRORS`.
 */
export function allowedErrors(level: number, pairCount: number): number {
  const byPairs = Math.floor((pairCount * allowedPercentOfPairs(level) + 99) / 100);

  return Math.max(MIN_ALLOWED_ERRORS, byPairs);
}

/** Los contadores de un intento con los que se cuentan los errores. */
export type ErrorCounts = {
  blockedCount: number;
  resetCount: number;
  undoCount: number;
  routeRestarts: number;
  backtrackGestures: number;
};

/** Errores cometidos en un intento. */
export function errorsOf(counts: ErrorCounts): number {
  return (
    counts.blockedCount +
    counts.undoCount +
    counts.routeRestarts +
    counts.backtrackGestures +
    RESET_ERROR_WEIGHT * counts.resetCount
  );
}

/**
 * Los contadores de errores de un intento guardado o en curso. Sin contadores de gestos (un
 * avance guardado antes de existir estas reglas) esos cuentan cero.
 */
export function errorCountsOf(source: {
  undoCount: number;
  resetCount: number;
  stats?: { blockedCount: number; routeRestarts: number; backtrackGestures: number };
}): ErrorCounts {
  return {
    blockedCount: source.stats?.blockedCount ?? 0,
    resetCount: source.resetCount,
    undoCount: source.undoCount,
    routeRestarts: source.stats?.routeRestarts ?? 0,
    backtrackGestures: source.stats?.backtrackGestures ?? 0,
  };
}

/** El intento ya no se puede aprobar: los errores superaron lo permitido. */
export function isOverLimit(level: number, pairCount: number, counts: ErrorCounts): boolean {
  return errorsOf(counts) > allowedErrors(level, pairCount);
}

/** Se aprueba un intento si el tablero quedo resuelto y los errores no pasaron el limite. */
export function isTryPassed(
  input: { level: number; pairCount: number; solved: boolean } & ErrorCounts,
): boolean {
  return input.solved && !isOverLimit(input.level, input.pairCount, input);
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
 * - "complete": paso el ultimo tablero: la partida termina completa.
 * - "retry": no lo paso y le quedan intentos en este nivel.
 * - "restart": agoto los intentos en un nivel obligatorio (1 a 10): la partida
 *   termina como fallida y, si juega de nuevo, empieza desde el nivel 1.
 * - "close": agoto los intentos desde el nivel 11: la partida termina con el
 *   nivel maximo que alcanzo a pasar.
 */
export type NextStep =
  | "next-level"
  | "complete"
  | "retry"
  | "restart"
  | "close";

export function nextStepAfter(outcome: TryOutcome): NextStep {
  if (outcome.passed) {
    return outcome.level >= TOTAL_LEVELS ? "complete" : "next-level";
  }
  if (outcome.tryNumber < MAX_TRIES_PER_LEVEL) return "retry";

  return outcome.level <= MIN_LEVELS ? "restart" : "close";
}

export type ReplayedFlow =
  | {
      ok: true;
      /** Nivel e intento que toca jugar a continuacion (si la partida sigue). */
      level: number;
      tryNumber: number;
      /** La partida ya no puede continuar. */
      terminal: "complete" | "restart" | "close" | null;
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
  let terminal: "complete" | "restart" | "close" | null = null;

  for (const result of results) {
    if (terminal !== null) return { ok: false };
    if (result.level !== level || result.tryNumber !== tryNumber) {
      return { ok: false };
    }

    const step = nextStepAfter(result);

    if (step === "next-level" || step === "complete") {
      maxLevelPassed = Math.max(maxLevelPassed, result.level);
    }

    if (step === "next-level") {
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

/** Clave del resultado dentro de la partida: el primer intento conserva la de siempre ("3"). */
export function nodeResultKey(level: number, tryNumber: number): string {
  return tryNumber <= 1 ? String(level) : `${level}.${tryNumber}`;
}
