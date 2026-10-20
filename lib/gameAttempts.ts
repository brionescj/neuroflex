/**
 * Reglas puras (sin base de datos) del registro de partidas: validan lo que
 * manda el navegador, calculan la edad y resumen de un intento. Viven aparte
 * del endpoint para poder probarlas con tests.
 *
 * El navegador es una fuente poco confiable: todo se valida y se acota
 * (tipos, rangos, tamano) antes de guardarse.
 */

export const ATTEMPT_GAME_IDS = [
  "color-sequence",
  "mini-cases",
  "node-connection",
] as const;

export type AttemptGameId = (typeof ATTEMPT_GAME_IDS)[number];

export function isAttemptGameId(value: unknown): value is AttemptGameId {
  return (
    typeof value === "string" &&
    (ATTEMPT_GAME_IDS as readonly string[]).includes(value)
  );
}

export type DevicePointer = "touch" | "mouse" | "mixed";

export type DeviceInfo = {
  pointer: DevicePointer;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  platform: string;
  browser: string;
  timeZone: string;
  language: string;
};

export type AttemptInfo = {
  attemptId: string;
  startedAt: Date;
  contentVersion: string;
  sessionId: string;
  device: DeviceInfo;
};

export type LevelReport = {
  /** Unico dentro del intento: "3" (nivel) o el caseKey (mini casos). */
  key: string;
  /** Posicion en la partida: nivel o numero de caso, desde 1. */
  index: number;
  tryNumber: number;
  metrics: Record<string, unknown>;
  activeMsGross: number;
  activeMsNet: number;
  completedAt: Date;
  orderedOptionKeys: string[] | null;
};

export type AttemptCloseStatus = "finished" | "failed";

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const KEY_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;

const NODE_OPTIONAL_COUNTERS = [
  "corrections",
  "strokesStarted",
  "backtrackCells",
  "backtrackGestures",
  "routeRestarts",
  "restartCells",
  "resetCells",
  "blockedCount",
  "cellsErased",
] as const;

const MAX_ACTIVE_MS = 24 * 60 * 60 * 1000;
const MAX_METRICS_BYTES = 20_000;
const MAX_JSON_DEPTH = 4;

/** Tolerancia entre el reloj del navegador y el del servidor. */
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const MAX_PAST_MS = 400 * 24 * 60 * 60 * 1000;

function fail<T>(message: string): ParseResult<T> {
  return { ok: false, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInt(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function isTimeMs(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_ACTIVE_MS
  );
}

function shortText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0
    ? value.slice(0, 60)
    : fallback;
}

/** Solo JSON plano y acotado: sin funciones, NaN ni estructuras profundas. */
function isBoundedJson(value: unknown, depth = 0): boolean {
  if (depth > MAX_JSON_DEPTH) return false;
  if (value === null) return true;

  switch (typeof value) {
    case "string":
    case "boolean":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object":
      if (Array.isArray(value)) {
        return value.every((item) => isBoundedJson(item, depth + 1));
      }
      return Object.values(value as Record<string, unknown>).every((item) =>
        isBoundedJson(item, depth + 1),
      );
    default:
      return false;
  }
}

function parseDate(value: unknown, now: Date): Date {
  if (typeof value !== "string") return now;

  const time = Date.parse(value);

  if (
    Number.isNaN(time) ||
    time > now.getTime() + CLOCK_SKEW_MS ||
    time < now.getTime() - MAX_PAST_MS
  ) {
    return now;
  }

  return new Date(time);
}

export function parseDeviceInfo(raw: unknown): DeviceInfo {
  const r = isRecord(raw) ? raw : {};

  const pointer: DevicePointer =
    r.pointer === "touch" || r.pointer === "mouse" || r.pointer === "mixed"
      ? r.pointer
      : "mixed";

  const dimension = (value: unknown) =>
    isInt(value, 0, 20_000) ? value : 0;

  const pixelRatio =
    typeof r.pixelRatio === "number" &&
    Number.isFinite(r.pixelRatio) &&
    r.pixelRatio > 0 &&
    r.pixelRatio <= 10
      ? r.pixelRatio
      : 1;

  return {
    pointer,
    viewportWidth: dimension(r.viewportWidth),
    viewportHeight: dimension(r.viewportHeight),
    pixelRatio,
    platform: shortText(r.platform, "desconocido"),
    browser: shortText(r.browser, "desconocido"),
    timeZone: shortText(r.timeZone, "desconocida"),
    language: shortText(r.language, "desconocido"),
  };
}

export function parseAttemptInfo(
  raw: unknown,
  now: Date = new Date(),
): ParseResult<AttemptInfo> {
  if (!isRecord(raw)) return fail("Falta el bloque attempt.");

  if (typeof raw.attemptId !== "string" || !ID_PATTERN.test(raw.attemptId)) {
    return fail("attemptId invalido.");
  }

  if (typeof raw.sessionId !== "string" || !ID_PATTERN.test(raw.sessionId)) {
    return fail("sessionId invalido.");
  }

  return {
    ok: true,
    value: {
      attemptId: raw.attemptId,
      sessionId: raw.sessionId,
      startedAt: parseDate(raw.startedAt, now),
      contentVersion: shortText(raw.contentVersion, "sin-version"),
      device: parseDeviceInfo(raw.device),
    },
  };
}

function parseMetrics(
  gameId: AttemptGameId,
  raw: unknown,
): ParseResult<Record<string, unknown>> {
  if (!isRecord(raw)) return fail("metrics debe ser un objeto.");

  if (!isBoundedJson(raw) || JSON.stringify(raw).length > MAX_METRICS_BYTES) {
    return fail("metrics invalido o demasiado grande.");
  }

  if (gameId === "color-sequence") {
    if (
      !isInt(raw.sequenceLength, 1, 5000) ||
      !isInt(raw.correctCount, 0, 5000) ||
      raw.correctCount > raw.sequenceLength
    ) {
      return fail("metrics de seriacion invalido.");
    }
  }

  if (gameId === "node-connection") {
    if (
      !isInt(raw.pairCount, 1, 50) ||
      !isInt(raw.undoCount, 0, 100_000) ||
      !isInt(raw.resetCount, 0, 100_000)
    ) {
      return fail("metrics de nodos invalido.");
    }

    // Contadores opcionales (partidas anteriores a registrarlos no los traen).
    for (const key of NODE_OPTIONAL_COUNTERS) {
      if (raw[key] !== undefined && !isInt(raw[key], 0, 1_000_000)) {
        return fail(`metrics de nodos invalido: ${key}.`);
      }
    }
  }

  return { ok: true, value: raw };
}

export function parseLevelReport(
  gameId: AttemptGameId,
  raw: unknown,
  now: Date = new Date(),
): ParseResult<LevelReport> {
  if (!isRecord(raw)) return fail("Falta el bloque result.");

  if (typeof raw.key !== "string" || !KEY_PATTERN.test(raw.key)) {
    return fail("key invalida.");
  }

  if (!isInt(raw.index, 1, 10_000)) return fail("index invalido.");

  const tryNumber = raw.tryNumber === undefined ? 1 : raw.tryNumber;
  if (!isInt(tryNumber, 1, 1000)) return fail("tryNumber invalido.");

  if (!isTimeMs(raw.activeMsGross) || !isTimeMs(raw.activeMsNet)) {
    return fail("Tiempos activos invalidos.");
  }

  const metrics = parseMetrics(gameId, raw.metrics);
  if (!metrics.ok) return metrics;

  let orderedOptionKeys: string[] | null = null;

  if (gameId === "mini-cases") {
    const keys = raw.orderedOptionKeys;

    if (
      !Array.isArray(keys) ||
      keys.length !== 4 ||
      !keys.every((k) => typeof k === "string" && KEY_PATTERN.test(k))
    ) {
      return fail("orderedOptionKeys debe tener 4 opciones validas.");
    }

    orderedOptionKeys = keys as string[];
  }

  return {
    ok: true,
    value: {
      key: raw.key,
      index: raw.index,
      tryNumber,
      metrics: metrics.value,
      activeMsGross: raw.activeMsGross,
      // El tiempo neto nunca puede superar al bruto.
      activeMsNet: Math.min(raw.activeMsNet, raw.activeMsGross),
      completedAt: parseDate(raw.completedAt, now),
      orderedOptionKeys,
    },
  };
}

export function parseCloseStatus(
  raw: unknown,
): ParseResult<AttemptCloseStatus> {
  if (raw === "finished" || raw === "failed") return { ok: true, value: raw };

  return fail("status invalido.");
}

/**
 * Edad en anos cumplidos a la fecha `at`. Acepta AAAA-MM-DD y DD-MM-AAAA (o
 * con "/"). Devuelve null si falta o no se entiende: nunca se inventa.
 */
export function ageAt(
  birthDate: string | null | undefined,
  at: Date,
): number | null {
  if (!birthDate) return null;

  const text = birthDate.trim();
  let year: number;
  let month: number;
  let day: number;

  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(text);
  const latin = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (latin) {
    day = Number(latin[1]);
    month = Number(latin[2]);
    year = Number(latin[3]);
  } else {
    return null;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  let age = at.getUTCFullYear() - year;
  const atMonth = at.getUTCMonth() + 1;

  if (atMonth < month || (atMonth === month && at.getUTCDate() < day)) {
    age -= 1;
  }

  return age >= 10 && age <= 100 ? age : null;
}

export type StudentSnapshot = {
  paralelo: number | null;
  entryYear: number | null;
  ageAtStart: number | null;
  studyShift: string | null;
  ciudad: string | null;
  region: string | null;
  // Los carga el admin mas adelante; hasta entonces quedan vacios.
  gender: string | null;
  university: string | null;
  studyPlan: string | null;
};

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim().slice(0, 80)
    : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Copia los datos del estudiante con los que se agrupa despues. Se guarda
 * una foto en cada intento: si el alumno cambia de paralelo o ciudad, sus
 * intentos antiguos conservan lo que valia cuando jugo.
 */
export function buildStudentSnapshot(
  student: Record<string, unknown> | null,
  startedAt: Date,
): StudentSnapshot {
  const s = student ?? {};

  return {
    paralelo: numberOrNull(s.paralelo),
    entryYear: numberOrNull(s.entryYear),
    ageAtStart: ageAt(
      typeof s.birthDate === "string" ? s.birthDate : null,
      startedAt,
    ),
    studyShift: textOrNull(s.studyShift),
    ciudad: textOrNull(s.ciudad),
    region: textOrNull(s.region),
    gender: textOrNull(s.gender),
    university: textOrNull(s.university),
    studyPlan: textOrNull(s.studyPlan),
  };
}

export type StoredResult = {
  index: number;
  tryNumber: number;
  metrics: Record<string, unknown>;
  activeMsGross: number;
  activeMsNet: number;
};

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Resumen del intento, recalculado SIEMPRE desde los resultados guardados. */
export function summarizeResults(
  gameId: AttemptGameId,
  results: StoredResult[],
): Record<string, number> {
  const common = {
    levelsReported: results.length,
    activeMsGross: results.reduce((sum, r) => sum + r.activeMsGross, 0),
    activeMsNet: results.reduce((sum, r) => sum + r.activeMsNet, 0),
  };

  if (gameId === "color-sequence") {
    return {
      ...common,
      maxLevel: results.reduce((max, r) => Math.max(max, r.index), 0),
      totalCorrect: results.reduce((s, r) => s + num(r.metrics.correctCount), 0),
      totalItems: results.reduce((s, r) => s + num(r.metrics.sequenceLength), 0),
    };
  }

  if (gameId === "node-connection") {
    return {
      ...common,
      maxLevel: results.reduce((max, r) => Math.max(max, r.index), 0),
      totalUndo: results.reduce((s, r) => s + num(r.metrics.undoCount), 0),
      totalReset: results.reduce((s, r) => s + num(r.metrics.resetCount), 0),
    };
  }

  return {
    ...common,
    totalCorrectSteps: results.reduce(
      (s, r) => s + num(r.metrics.correctSteps),
      0,
    ),
    fullyCorrectCases: results.filter((r) => r.metrics.isFullyCorrect === true)
      .length,
  };
}

export type ScoredOption = { optionKey: string; correctStep: number };

/**
 * Pasos que el estudiante dejo en su lugar correcto. Es la unica
 * implementacion del puntaje: la usan el envio de cada caso y el registro de
 * la partida, para que ambos nunca discrepen.
 */
export function scoreMiniCaseOrder(
  options: ScoredOption[],
  orderedOptionKeys: string[],
): { correctSteps: number; isFullyCorrect: boolean } {
  const correctSteps = orderedOptionKeys.filter((optionKey, index) => {
    const option = options.find((o) => o.optionKey === optionKey);
    return option?.correctStep === index + 1;
  }).length;

  return { correctSteps, isFullyCorrect: correctSteps === options.length };
}
