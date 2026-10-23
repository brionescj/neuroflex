/**
 * Regla de desbloqueo de los juegos. Es la unica definicion: para cambiarla
 * (otro nivel, u otra condicion) se edita
 * aqui y en ningun otro lugar.
 *
 * Mini Casos se desbloquea cuando el estudiante aprobo el nivel 10 de
 * Seriacion de colores Y completo el nivel 10 de Conexion de nodos. Pueden
 * ser en partidas distintas y en cualquier orden.
 */

export const MINI_CASES_UNLOCK_LEVEL = 10;

/** Cambia si cambia la regla: queda anotada en cada desbloqueo. */
export const MINI_CASES_RULE_VERSION = "mini-cases-v1";

export type MiniCasesEvidence = {
  /** Nivel mas alto aprobado en Seriacion de colores, en cualquiera de sus partidas (0 si ninguno). */
  colorSequenceMaxLevelPassed: number;
  /** Nivel mas alto completado en Conexion de nodos, en cualquiera de sus partidas (0 si ninguno). */
  nodeMaxLevelCompleted: number;
};

export function meetsMiniCasesRule(evidence: MiniCasesEvidence): boolean {
  return (
    evidence.colorSequenceMaxLevelPassed >= MINI_CASES_UNLOCK_LEVEL &&
    evidence.nodeMaxLevelCompleted >= MINI_CASES_UNLOCK_LEVEL
  );
}
