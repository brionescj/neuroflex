/**
 * Reglas de aprobacion de Conexion de nodos, en el servidor. Copia de
 * src/features/games/node-connection/rules.ts (el servidor no comparte codigo
 * con el navegador): lib/nodeRulesParity.test.ts comprueba que ambas coincidan.
 *
 * Un nivel se pasa con el tablero resuelto y sin agotar los errores que se
 * permiten. Error = cada choque + 2 por cada "Rehacer tablero".
 */

export const NODE_MAX_TRIES = 3;
export const NODE_MIN_LEVELS = 10;
export const NODE_RESET_ERROR_WEIGHT = 2;

export const NODE_MIN_ALLOWED_ERRORS = 3;

/** Copia de allowedPercentOfPairs del navegador: 100 % (1 a 5), 60 % (6 a 10) y 40 % (11 a 15). */
export function nodeAllowedPercentOfPairs(level: number): number {
  if (level <= 5) return 100;
  if (level <= 10) return 60;

  return 40;
}

export function nodeAllowedErrors(level: number, pairCount: number): number {
  const byPairs = Math.floor((pairCount * nodeAllowedPercentOfPairs(level) + 99) / 100);

  return Math.max(NODE_MIN_ALLOWED_ERRORS, byPairs);
}

export function nodeErrorsOf(counts: {
  blockedCount: number;
  resetCount: number;
}): number {
  return counts.blockedCount + NODE_RESET_ERROR_WEIGHT * counts.resetCount;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Puntaje de un intento de nivel, recalculado por el servidor: lo que el
 * navegador diga sobre si lo paso se ignora. Devuelve null si el resultado no
 * trae los contadores (guardado antes de existir los errores permitidos).
 */
export function scoreNodeTry(
  level: number,
  metrics: Record<string, unknown>,
): { errors: number; errorsAllowed: number; passed: boolean } | null {
  if (typeof metrics.blockedCount !== "number") return null;

  const pairCount = num(metrics.pairCount);
  const errors = nodeErrorsOf({
    blockedCount: metrics.blockedCount,
    resetCount: num(metrics.resetCount),
  });
  const errorsAllowed = nodeAllowedErrors(level, pairCount);

  return {
    errors,
    errorsAllowed,
    // Sin `solved` (resultado anterior a los reintentos) el tablero se habia completado.
    passed: metrics.solved !== false && errors <= errorsAllowed,
  };
}

/**
 * Si el resultado de un nivel de nodos es un nivel pasado. Los resultados
 * anteriores a los errores permitidos (sin `passed`) solo se guardaban al
 * completar el tablero: cuentan como pasados.
 */
export function isNodeResultPassed(result: {
  index: number;
  metrics: Record<string, unknown>;
}): boolean {
  if (typeof result.metrics.passed === "boolean") return result.metrics.passed;

  return true;
}
