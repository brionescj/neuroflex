import { NODE_COLORS } from "./colors";
import type { NodeColorId, NodeEvent } from "./types";

/**
 * Tope de eventos por nivel. Pasado el tope no se guardan mas, pero se cuentan
 * en `dropped` para saber que la bitacora quedo incompleta (los contadores de
 * NodeStats siguen siendo exactos). Debe coincidir con MAX_NODE_EVENTS de
 * lib/attemptEvents.ts.
 */
export const MAX_NODE_EVENTS = 400;

const COLOR_IDS = new Set<string>(NODE_COLORS.map((c) => c.id));

const MAX_TIME_MS = 24 * 60 * 60 * 1000;
const MAX_CELL_INDEX = 49;
const MAX_CELL_COUNT = 2_500;

export type NodeEventLog = {
  push: (event: NodeEvent) => void;
  /** Copia de lo registrado hasta ahora. */
  events: () => NodeEvent[];
  dropped: () => number;
};

/** Bitacora de un nivel. Puede retomarse con lo que se guardo antes de un F5. */
export function createNodeEventLog(
  seed: { events: NodeEvent[]; dropped: number } = { events: [], dropped: 0 },
): NodeEventLog {
  const list = seed.events.slice(0, MAX_NODE_EVENTS);
  let dropped = seed.dropped + Math.max(0, seed.events.length - list.length);

  return {
    push(event) {
      if (list.length < MAX_NODE_EVENTS) list.push(event);
      else dropped += 1;
    },
    events: () => [...list],
    dropped: () => dropped,
  };
}

function isInt(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function isColor(value: unknown): value is NodeColorId {
  return typeof value === "string" && COLOR_IDS.has(value);
}

function cleanEvent(raw: unknown): NodeEvent | null {
  if (typeof raw !== "object" || raw === null) return null;

  const r = raw as Record<string, unknown>;

  if (!isInt(r.t, 0, MAX_TIME_MS)) return null;

  const t = r.t;

  switch (r.type) {
    case "start":
      if (
        !isColor(r.color) ||
        !isInt(r.row, 0, MAX_CELL_INDEX) ||
        !isInt(r.col, 0, MAX_CELL_INDEX)
      ) {
        return null;
      }

      return {
        t,
        type: "start",
        color: r.color,
        row: r.row,
        col: r.col,
        ...(isInt(r.restartCells, 1, MAX_CELL_COUNT)
          ? { restartCells: r.restartCells }
          : {}),
      };
    case "end":
      return isColor(r.color) &&
        isInt(r.len, 0, MAX_CELL_COUNT) &&
        typeof r.done === "boolean" &&
        isInt(r.back, 0, MAX_CELL_COUNT)
        ? { t, type: "end", color: r.color, len: r.len, done: r.done, back: r.back }
        : null;
    case "undo":
      return { t, type: "undo" };
    case "reset":
      return isInt(r.cells, 0, MAX_CELL_COUNT)
        ? { t, type: "reset", cells: r.cells }
        : null;
    case "blocked":
      return isInt(r.row, 0, MAX_CELL_INDEX) && isInt(r.col, 0, MAX_CELL_INDEX)
        ? { t, type: "blocked", row: r.row, col: r.col }
        : null;
    default:
      return null;
  }
}

/**
 * Valida la bitacora de un avance guardado. Es tolerante: un evento malo se
 * descarta y el resto se conserva (la bitacora es contexto, no puntaje).
 */
export function cleanNodeEvents(raw: unknown): NodeEvent[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .slice(0, MAX_NODE_EVENTS)
    .map(cleanEvent)
    .filter((event): event is NodeEvent => event !== null);
}

export function cleanDroppedCount(raw: unknown): number {
  return isInt(raw, 0, 1_000_000) ? raw : 0;
}
