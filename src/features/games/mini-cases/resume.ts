import type {
  ApiMiniCase,
  ApiMiniCaseOption,
  MiniCaseResult,
  MiniCasesProgress,
  MiniCasesSavedPhase,
} from "./types";

const SAVED_PHASES: MiniCasesSavedPhase[] = ["reading", "result", "finished"];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isResult(value: unknown): value is MiniCaseResult {
  if (typeof value !== "object" || value === null) return false;

  const r = value as Record<string, unknown>;

  return (
    typeof r.caseKey === "string" &&
    typeof r.correctSteps === "number" &&
    typeof r.isFullyCorrect === "boolean" &&
    typeof r.decisionTimeMs === "number"
  );
}

/**
 * El avance viene de la base de datos como un blob que escribio el
 * cliente: puede estar corrupto, ser de una version vieja o haber sido
 * editado a mano. Aqui se valida TODO antes de usarlo; si algo no cuadra
 * se devuelve null y el llamador lo descarta.
 */
export function parseMiniCasesProgress(
  raw: unknown,
): MiniCasesProgress | null {
  if (typeof raw !== "object" || raw === null) return null;

  const r = raw as Record<string, unknown>;

  if (r.version !== 1) return null;

  if (!isStringArray(r.caseOrder) || r.caseOrder.length === 0) return null;
  const caseOrder = r.caseOrder;

  if (new Set(caseOrder).size !== caseOrder.length) return null;

  if (
    typeof r.optionOrder !== "object" ||
    r.optionOrder === null ||
    Array.isArray(r.optionOrder)
  ) {
    return null;
  }
  const optionOrder = r.optionOrder as Record<string, unknown>;
  const typedOptionOrder: Record<string, string[]> = {};

  for (const caseKey of caseOrder) {
    const keys = optionOrder[caseKey];
    if (!isStringArray(keys)) return null;
    typedOptionOrder[caseKey] = keys;
  }

  if (typeof r.caseIndex !== "number" || !Number.isInteger(r.caseIndex)) {
    return null;
  }
  const caseIndex = r.caseIndex;
  const total = caseOrder.length;

  if (caseIndex < 0 || caseIndex >= total) return null;

  if (
    typeof r.phase !== "string" ||
    !SAVED_PHASES.includes(r.phase as MiniCasesSavedPhase)
  ) {
    return null;
  }
  const phase = r.phase as MiniCasesSavedPhase;

  if (!Array.isArray(r.results) || !r.results.every(isResult)) return null;
  const results = r.results as MiniCaseResult[];

  // Coherencia entre la fase y cuantos resultados deberia haber.
  const expectedResults =
    phase === "reading" ? caseIndex : phase === "result" ? caseIndex + 1 : total;

  if (results.length !== expectedResults) return null;
  if (phase === "finished" && caseIndex !== total - 1) return null;

  // Cada resultado debe corresponder al caso de su posicion: asi el
  // vinculo resultado <-> caso interno no depende de lo que vio el alumno.
  for (let i = 0; i < results.length; i++) {
    if (results[i]?.caseKey !== caseOrder[i]) return null;
  }

  return {
    version: 1,
    caseOrder,
    optionOrder: typedOptionOrder,
    caseIndex,
    phase,
    results,
  };
}

export type ResumePlan = {
  /** Los casos de esta partida, en el orden y con las opciones que ya vio. */
  orderedCases: ApiMiniCase[];

  snapshot: MiniCasesProgress;
};

/**
 * Reordena el banco actual segun el avance guardado. Devuelve null (y el
 * avance debe descartarse) si el banco ya no coincide con lo guardado:
 * un caso retirado, o opciones que cambiaron. Casos NUEVOS en el banco se
 * ignoran: la partida en curso termina con los casos con los que empezo.
 */
export function buildResumePlan(
  bank: ApiMiniCase[],
  raw: unknown,
): ResumePlan | null {
  const snapshot = parseMiniCasesProgress(raw);
  if (!snapshot) return null;

  const byKey = new Map(bank.map((c) => [c.caseKey, c]));
  const orderedCases: ApiMiniCase[] = [];

  for (const caseKey of snapshot.caseOrder) {
    const original = byKey.get(caseKey);
    const savedOptionKeys = snapshot.optionOrder[caseKey];

    if (!original || !savedOptionKeys) return null;

    if (
      savedOptionKeys.length !== original.options.length ||
      new Set(savedOptionKeys).size !== savedOptionKeys.length
    ) {
      return null;
    }

    const optionByKey = new Map(original.options.map((o) => [o.optionKey, o]));
    const options: ApiMiniCaseOption[] = [];

    for (const optionKey of savedOptionKeys) {
      const option = optionByKey.get(optionKey);
      if (!option) return null;
      options.push(option);
    }

    orderedCases.push({ ...original, options });
  }

  return { orderedCases, snapshot };
}

export function buildProgressSnapshot(
  cases: ApiMiniCase[],
  caseIndex: number,
  phase: MiniCasesSavedPhase,
  results: MiniCaseResult[],
): MiniCasesProgress {
  return {
    version: 1,
    caseOrder: cases.map((c) => c.caseKey),
    optionOrder: Object.fromEntries(
      cases.map((c) => [c.caseKey, c.options.map((o) => o.optionKey)]),
    ),
    caseIndex,
    phase,
    results,
  };
}
