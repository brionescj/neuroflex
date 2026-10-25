import { GameUnlock } from "./models/GameUnlock";

/** Lo que se adelanta de los desbloqueos al abrir la sesion: solo los que YA estan registrados. */
export type UnlockedGames = { miniCases?: true };

/**
 * Los juegos que el estudiante ya tiene desbloqueados, para entregarlos junto con la sesion
 * (login y /auth/me) y que el menu no tenga que esperar otra consulta.
 *
 * Es una lectura simple: nunca mide ni registra un desbloqueo nuevo (eso lo sigue haciendo
 * games/access al abrir el menu). Un "todavia no" no se adelanta: se consulta como siempre.
 */
export async function findUnlockedGames(rut: string, role: string): Promise<UnlockedGames | undefined> {
  if (role !== "student") return undefined;

  const record = await GameUnlock.findOne({ studentRut: rut, gameId: "mini-cases" }).select("_id").lean();

  return record ? { miniCases: true } : undefined;
}
