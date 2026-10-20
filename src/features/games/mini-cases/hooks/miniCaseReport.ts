import type { LevelReport } from "../../attempts/types";
import type { MiniCaseResult } from "../types";

/**
 * Convierte el resultado de un caso al formato del registro de partidas.
 * Devuelve null si el resultado no guardo el orden elegido (partidas
 * anteriores al registro): sin el orden el servidor no puede puntuarlo.
 *
 * `position` es el lugar del caso en esta partida, desde 1.
 */
export function toMiniCaseReport(
  result: MiniCaseResult,
  position: number,
  fallbackDate: string,
): LevelReport | null {
  const ordered = result.orderedOptionKeys;

  if (!ordered || ordered.length !== 4) return null;

  const gross = result.decisionTimeMs;

  return {
    key: result.caseKey,
    index: position,
    tryNumber: 1,
    metrics: { decisionTimeMs: gross },
    activeMsGross: gross,
    activeMsNet: Math.min(result.activeMsNet ?? gross, gross),
    completedAt: result.completedAt ?? fallbackDate,
    orderedOptionKeys: ordered,
  };
}

/** Todos los reportes que se pueden armar; los resultados antiguos se omiten. */
export function toMiniCaseReports(results: MiniCaseResult[]): LevelReport[] {
  const now = new Date().toISOString();
  const reports: LevelReport[] = [];

  results.forEach((result, i) => {
    const report = toMiniCaseReport(result, i + 1, now);

    if (report) reports.push(report);
  });

  return reports;
}
