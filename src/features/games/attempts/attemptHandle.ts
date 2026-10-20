import type { AttemptHandle } from "./types";

const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Lee el identificador de partida de un avance guardado. Si falta o esta mal
 * formado devuelve undefined (sin descartar el avance): una partida
 * guardada antes de existir el registro simplemente recibe uno nuevo.
 */
export function parseAttemptHandle(raw: unknown): AttemptHandle | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;

  const r = raw as Record<string, unknown>;

  if (typeof r.attemptId !== "string" || !ID_PATTERN.test(r.attemptId)) {
    return undefined;
  }

  if (typeof r.startedAt !== "string" || Number.isNaN(Date.parse(r.startedAt))) {
    return undefined;
  }

  return { attemptId: r.attemptId, startedAt: r.startedAt };
}

const MAX_ACTIVE_MS = 24 * 60 * 60 * 1000;

/** Tiempo opcional (ms) guardado en un resultado: valido o ausente. */
export function optionalTimeMs(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_ACTIVE_MS
    ? value
    : undefined;
}

/** Fecha ISO opcional guardada en un resultado: valida o ausente. */
export function optionalIsoDate(value: unknown): string | undefined {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : undefined;
}
