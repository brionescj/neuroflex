import type { DemoPlan } from "./plan.js";

/**
 * Los documentos tal como se guardan en la base (misma forma que los que crea
 * el registro de partidas). Aparte del script para poder probarlos contra los
 * modelos sin conectar.
 */

export function attemptDocuments(rut: string, plan: DemoPlan) {
  return plan.attempts.map((a) => ({
    attemptId: a.attemptId,
    studentRut: rut,
    gameId: a.gameId,
    attemptNumber: a.attemptNumber,
    status: a.status,
    startedAt: a.startedAt,
    lastActivityAt: a.lastActivityAt,
    ...(a.finishedAt ? { finishedAt: a.finishedAt } : {}),
    contentVersion: a.contentVersion,
    student: a.student,
    sessions: [{ sessionId: a.sessionId, firstSeenAt: a.startedAt, device: a.device }],
    summary: a.summary,
  }));
}

export function resultDocuments(rut: string, plan: DemoPlan) {
  return plan.attempts.flatMap((a) =>
    a.results.map((r) => ({
      attemptId: a.attemptId,
      studentRut: rut,
      gameId: a.gameId,
      key: r.key,
      index: r.index,
      tryNumber: r.tryNumber,
      sessionId: a.sessionId,
      student: a.student,
      metrics: r.metrics,
      events: r.events,
      activeMsGross: r.activeMsGross,
      activeMsNet: r.activeMsNet,
      completedAt: r.completedAt,
      device: a.device,
    })),
  );
}
