import { createHash } from "node:crypto";

import {
  analyzeColorSequenceResponse,
  analyzeNodeEvents,
  sanitizeColorTaps,
  sanitizeNodeEvents,
} from "./attemptEvents";
import {
  buildStudentSnapshot,
  sanitizeMiniCaseBehavior,
  scoreColorSequenceLevel,
  summarizeResults,
  type AttemptCloseStatus,
  type AttemptGameId,
  type AttemptInfo,
  type LevelReport,
  type StoredResult,
} from "./gameAttempts";
import {
  analyzeMiniCaseOrder,
  isPermutationOfOptions,
  type TextOption,
} from "./miniCaseScoring";
import { scoreNodeTry } from "./nodeRules";
import { GameAttempt } from "./models/GameAttempt";
import { GameLevelResult } from "./models/GameLevelResult";
import { MiniCase } from "./models/MiniCase";
import { Student } from "./models/Student";

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === 11000
  );
}

/**
 * Los casos del banco cambian con el tiempo: la version identifica con que
 * redaccion jugo cada estudiante, para no mezclar partidas no comparables.
 */
export async function miniCasesContentVersion(): Promise<string> {
  const cases = await MiniCase.find({ enabled: true })
    .sort({ caseKey: 1 })
    .lean();

  const hash = createHash("sha1");
  hash.update(JSON.stringify(cases.map((c: Record<string, unknown>) => [
    c.caseKey,
    c.baseText,
    c.twistText,
    c.promptText,
    c.options,
    c.alternateOrders ?? [],
  ])));

  return `bank-${hash.digest("hex").slice(0, 10)}`;
}

/**
 * Devuelve el intento, creandolo si es el primer mensaje que llega. Devuelve
 * null si el intento existe pero es de otro estudiante o de otro juego.
 */
export async function ensureAttempt(
  rut: string,
  gameId: AttemptGameId,
  info: AttemptInfo,
) {
  const existing = await GameAttempt.findOne({ attemptId: info.attemptId });

  if (existing) {
    if (existing.studentRut !== rut || existing.gameId !== gameId) {
      return null;
    }

    await GameAttempt.updateOne(
      { attemptId: info.attemptId, "sessions.sessionId": { $ne: info.sessionId } },
      {
        $push: {
          sessions: {
            sessionId: info.sessionId,
            firstSeenAt: new Date(),
            device: info.device,
          },
        },
      },
    );

    return existing;
  }

  const student = await Student.findOne({ rut }).lean();
  const snapshot = buildStudentSnapshot(student, info.startedAt);
  const contentVersion =
    gameId === "mini-cases"
      ? await miniCasesContentVersion()
      : info.contentVersion;

  // El numero de intento sale de contar los previos. Si dos mensajes crean
  // intentos a la vez, el indice unico rechaza al segundo y se reintenta.
  for (let tries = 0; tries < 3; tries++) {
    const attemptNumber =
      (await GameAttempt.countDocuments({ studentRut: rut, gameId })) + 1;

    try {
      return await GameAttempt.create({
        attemptId: info.attemptId,
        studentRut: rut,
        gameId,
        attemptNumber,
        status: "in_progress",
        startedAt: info.startedAt,
        lastActivityAt: new Date(),
        contentVersion,
        student: snapshot,
        sessions: [
          {
            sessionId: info.sessionId,
            firstSeenAt: new Date(),
            device: info.device,
          },
        ],
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;

      const created = await GameAttempt.findOne({ attemptId: info.attemptId });

      if (created) {
        return created.studentRut === rut && created.gameId === gameId
          ? created
          : null;
      }
    }
  }

  throw new Error("No se pudo asignar el numero de intento.");
}

export type SaveLevelOutcome = "saved" | "unknown-case" | "invalid-order";

/** Guarda (o reemplaza) un resultado. No toca la actividad del intento. */
async function upsertResult(
  rut: string,
  gameId: AttemptGameId,
  attempt: { attemptId: string; student: unknown },
  sessionId: string,
  device: unknown,
  report: LevelReport,
): Promise<SaveLevelOutcome> {
  let metrics = report.metrics;
  // Eventos finos ya limpios; sin ellos el documento conserva los que tuviera.
  let events: unknown[] | undefined;

  if (gameId === "color-sequence") {
    // Si paso el nivel lo decide el servidor con los umbrales: lo que diga el
    // navegador sobre porcentaje o aprobacion se ignora.
    const { sequenceLength, correctCount } = metrics;

    if (typeof sequenceLength === "number" && typeof correctCount === "number") {
      metrics = {
        ...metrics,
        ...scoreColorSequenceLevel(report.index, sequenceLength, correctCount),
      };
    }

    // Donde fallo, que tipo de error fue y el ritmo de la respuesta salen de
    // la secuencia y los toques, no de lo que diga el navegador.
    const taps = sanitizeColorTaps(report.events);
    const shown = metrics.shownSequence;

    if (taps && Array.isArray(shown) && shown.length === taps.length) {
      metrics = {
        ...metrics,
        ...analyzeColorSequenceResponse(shown as string[], taps),
      };
      events = taps;
    }
  }

  if (gameId === "node-connection") {
    // Si paso el nivel lo decide el servidor con los errores permitidos: lo
    // que diga el navegador sobre errores o aprobacion se ignora.
    const score = scoreNodeTry(report.index, metrics);

    if (score) metrics = { ...metrics, ...score };

    const clean = sanitizeNodeEvents(report.events);

    if (clean.length > 0) {
      metrics = { ...metrics, ...analyzeNodeEvents(clean) };
      events = clean;
    }
  }

  if (gameId === "mini-cases" && report.orderedOptionKeys) {
    // El puntaje lo calcula el servidor con la clave de respuesta: lo que
    // diga el navegador sobre aciertos se ignora.
    const miniCase = await MiniCase.findOne({
      caseKey: report.key,
      enabled: true,
    });

    if (!miniCase) return "unknown-case";

    const options: TextOption[] = miniCase.options.map(
      (o: TextOption) => ({
        optionKey: o.optionKey,
        text: o.text,
        correctStep: o.correctStep,
      }),
    );

    if (!isPermutationOfOptions(options, report.orderedOptionKeys)) {
      return "invalid-order";
    }

    // Todo lo que se guarda sale de la clave de respuesta del servidor; del
    // navegador solo el comportamiento, ya limpio y acotado.
    const behavior = sanitizeMiniCaseBehavior(metrics);

    metrics = {
      ...behavior.metrics,
      ...analyzeMiniCaseOrder(
        options,
        miniCase.alternateOrders ?? [],
        report.orderedOptionKeys,
        behavior.displayedOptionKeys,
      ),
      orderedOptionKeys: report.orderedOptionKeys,
    };
  }

  await GameLevelResult.updateOne(
    { attemptId: attempt.attemptId, key: report.key },
    {
      $set: {
        index: report.index,
        tryNumber: report.tryNumber,
        sessionId,
        metrics,
        activeMsGross: report.activeMsGross,
        activeMsNet: report.activeMsNet,
        completedAt: report.completedAt,
        device,
        // Reenviar un resultado sin eventos (p. ej. al archivar una partida
        // reanudada) no borra los que ya llegaron.
        ...(events ? { events } : {}),
      },
      $setOnInsert: {
        studentRut: rut,
        gameId,
        student: attempt.student,
        ...(events ? {} : { events: [] }),
      },
    },
    { upsert: true },
  );

  return "saved";
}

/**
 * Guarda (o reemplaza) uno o varios resultados. Es idempotente: la clave
 * (intento, key) es unica, asi que reenviar lo mismo no lo duplica. Los
 * resultados se guardan en paralelo (las claves son distintas, no chocan) y
 * la actividad del intento se actualiza una sola vez.
 */
export async function saveLevelResults(
  rut: string,
  gameId: AttemptGameId,
  attempt: { attemptId: string; student: unknown },
  sessionId: string,
  device: unknown,
  reports: LevelReport[],
): Promise<SaveLevelOutcome> {
  const outcomes = await Promise.all(
    reports.map((report) =>
      upsertResult(rut, gameId, attempt, sessionId, device, report),
    ),
  );

  await GameAttempt.updateOne(
    { attemptId: attempt.attemptId },
    { $set: { lastActivityAt: new Date() } },
  );

  return outcomes.find((outcome) => outcome !== "saved") ?? "saved";
}

export function saveLevelResult(
  rut: string,
  gameId: AttemptGameId,
  attempt: { attemptId: string; student: unknown },
  sessionId: string,
  device: unknown,
  report: LevelReport,
): Promise<SaveLevelOutcome> {
  return saveLevelResults(rut, gameId, attempt, sessionId, device, [report]);
}

/** Cierra el intento y recalcula su resumen desde los resultados guardados. */
export async function closeAttempt(
  gameId: AttemptGameId,
  attempt: { attemptId: string; finishedAt?: Date | null },
  status: AttemptCloseStatus,
) {
  const rows = (await GameLevelResult.find({ attemptId: attempt.attemptId })
    .sort({ index: 1, tryNumber: 1 })
    .lean()) as StoredResult[];

  const summary = summarizeResults(gameId, rows);
  const now = new Date();

  await GameAttempt.updateOne(
    { attemptId: attempt.attemptId },
    {
      $set: {
        status,
        summary,
        lastActivityAt: now,
        // Cerrar dos veces no mueve la hora en que realmente termino.
        finishedAt: attempt.finishedAt ?? now,
      },
    },
  );

  return summary;
}
