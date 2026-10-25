import { isColorSequenceResultPassed } from "./gameAttempts";
import { isNodeResultPassed } from "./nodeRules";
import {
  MINI_CASES_RULE_VERSION,
  MINI_CASES_UNLOCK_LEVEL,
  meetsMiniCasesRule,
  type MiniCasesEvidence,
} from "./gameUnlocks";
import { GameLevelResult } from "./models/GameLevelResult";
import { GameUnlock } from "./models/GameUnlock";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === 11000
  );
}

/** Lo que el estudiante lleva logrado, sumando todas sus partidas. */
export async function collectMiniCasesEvidence(
  rut: string,
): Promise<MiniCasesEvidence> {
  const seriation = (await GameLevelResult.find({
    studentRut: rut,
    gameId: "color-sequence",
    index: { $gte: MINI_CASES_UNLOCK_LEVEL },
  }).lean()) as { index: number; metrics: Record<string, unknown> }[];

  const colorSequenceMaxLevelPassed = seriation
    .filter(isColorSequenceResultPassed)
    .reduce((max, r) => Math.max(max, r.index), 0);

  // En nodos tambien se guardan los intentos perdidos: solo cuenta el que se paso.
  const node = (await GameLevelResult.find({
    studentRut: rut,
    gameId: "node-connection",
    index: { $gte: MINI_CASES_UNLOCK_LEVEL },
  }).lean()) as { index: number; metrics: Record<string, unknown> }[];

  const nodeMaxLevelPassed = node
    .filter(isNodeResultPassed)
    .reduce((max, r) => Math.max(max, r.index), 0);

  return {
    colorSequenceMaxLevelPassed,
    nodeMaxLevelPassed,
  };
}

/**
 * Si el estudiante tiene Mini Casos desbloqueado. Si ya hay registro, la
 * respuesta es si y no se mira nada mas: es definitivo. Si no lo hay, se
 * mide y, de cumplirse la regla, se registra (una sola vez) con su fecha.
 */
export async function resolveMiniCasesAccess(rut: string): Promise<boolean> {
  const existing = await GameUnlock.findOne({
    studentRut: rut,
    gameId: "mini-cases",
  }).lean();

  if (existing) return true;

  const evidence = await collectMiniCasesEvidence(rut);

  if (!meetsMiniCasesRule(evidence)) return false;

  try {
    await GameUnlock.updateOne(
      { studentRut: rut, gameId: "mini-cases" },
      {
        $setOnInsert: {
          unlockedAt: new Date(),
          source: "rule",
          rule: MINI_CASES_RULE_VERSION,
          evidence,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    // Dos solicitudes a la vez: la otra ya lo registro.
    if (!isDuplicateKeyError(error)) throw error;
  }

  return true;
}
