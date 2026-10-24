import { isColorSequenceResultPassed } from "../gameAttempts";
import { chileDate } from "./chartsLists";
import { round } from "./numbers";
import { isDateKey, rangeWindow } from "./time";
import { GAME_LABELS, type AttemptRow, type AttemptState, type GameId, type HistoryPage, type ResultRow } from "./types";

/**
 * El historial «partida a partida» de un estudiante, una pagina a la vez. Se
 * pide ya recortado (pagina y fechas) para no traer de la base todo el historial.
 */

export const HISTORY_PAGE_SIZE = 10;

export const HISTORY_COLUMNS = ["Juego", "Partida", "Inicio", "Estado", "Resultados guardados", "Mejor nivel", "Tiempo activo (min)"];

const DAY_MS = 24 * 60 * 60 * 1000;

export function stateOf(attempt: Pick<AttemptRow, "status">): AttemptState {
  if (attempt.status === "finished") return "finished";
  if (attempt.status === "failed") return "failed";

  return "open";
}

/**
 * «Sin terminar» no es «abandonada»: la partida queda abierta hasta que el estudiante la
 * termine o falle, y si vuelve la retoma. Lo que se sabe es cuándo fue su última actividad.
 */
export function outcomeOf(attempt: AttemptRow, now: Date): string {
  const state = stateOf(attempt);

  if (state === "finished") return "Terminada";
  if (state === "failed") return "Fallida";

  const days = Math.floor((now.getTime() - attempt.lastActivityAt.getTime()) / DAY_MS);

  return `Sin terminar (${days <= 0 ? "activa hoy" : `última actividad hace ${days} ${days === 1 ? "día" : "días"}`})`;
}

/** El nivel mas alto de un juego en una lista de resultados: aprobado en Seriacion, completado en Nodos. */
export function bestLevelOf(results: ResultRow[], game: GameId): number {
  return results
    .filter((r) => r.gameId === game && (game !== "color-sequence" || isColorSequenceResultPassed(r)))
    .reduce((max, r) => Math.max(max, r.index), 0);
}

/** La fila de una partida; `own` son solo los resultados de esa partida. */
export function historyRow(attempt: AttemptRow, own: ResultRow[], now: Date): (string | number | null)[] {
  return [
    GAME_LABELS[attempt.gameId],
    attempt.attemptNumber,
    chileDate(attempt.startedAt),
    outcomeOf(attempt, now),
    own.length,
    attempt.gameId === "mini-cases" || own.length === 0 ? null : bestLevelOf(own, attempt.gameId),
    round(own.reduce((sum, r) => sum + r.activeMsNet, 0) / 60_000, 1),
  ];
}

export type HistoryQuery = { page: number; from: string | null; to: string | null };

export type HistoryQueryResult = { ok: true; query: HistoryQuery } | { ok: false; message: string };

/** Valida lo pedido: pagina (desde 1) y, si se filtra, fechas AAAA-MM-DD con «desde» antes que «hasta». */
export function parseHistoryQuery(raw: { page?: unknown; from?: unknown; to?: unknown }): HistoryQueryResult {
  const text = (value: unknown) => (typeof value === "string" && value !== "" ? value : null);
  const page = text(raw.page) === null ? 1 : Number(raw.page);
  const from = text(raw.from);
  const to = text(raw.to);

  if (!Number.isInteger(page) || page < 1 || page > 10_000) return { ok: false, message: "La página no es válida." };
  if (from !== null && !isDateKey(from)) return { ok: false, message: "La fecha «desde» no es válida." };
  if (to !== null && !isDateKey(to)) return { ok: false, message: "La fecha «hasta» no es válida." };
  if (from !== null && to !== null && from > to) return { ok: false, message: "La fecha «desde» no puede ser posterior a «hasta»." };

  return { ok: true, query: { page, from, to } };
}

/** Las fechas elegidas como ventana de instantes (dias completos, hora de Chile); null = sin limite. */
export function historyWindow(query: HistoryQuery): { from: Date | null; until: Date | null } {
  return {
    from: query.from === null ? null : rangeWindow({ from: query.from, to: query.from }).from,
    until: query.to === null ? null : rangeWindow({ from: query.to, to: query.to }).until,
  };
}

export function historyPage(rows: HistoryPage["rows"], total: number, page: number): HistoryPage {
  return {
    columns: HISTORY_COLUMNS,
    rows,
    total,
    page,
    pageSize: HISTORY_PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE)),
  };
}
