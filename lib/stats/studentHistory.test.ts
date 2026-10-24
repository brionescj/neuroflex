import { describe, expect, it } from "vitest";

import {
  HISTORY_COLUMNS,
  HISTORY_PAGE_SIZE,
  historyPage,
  historyRow,
  historyWindow,
  outcomeOf,
  parseHistoryQuery,
} from "./studentHistory";
import type { AttemptRow, ResultRow } from "./types";

const NOW = new Date("2026-10-21T15:00:00Z");

const attempt = (extra: Partial<AttemptRow> = {}): AttemptRow => ({
  attemptId: "a1",
  studentRut: "11111111",
  gameId: "color-sequence",
  attemptNumber: 2,
  status: "finished",
  startedAt: new Date("2026-10-02T15:00:00Z"),
  lastActivityAt: new Date("2026-10-02T16:00:00Z"),
  contentVersion: "x",
  student: null,
  ...extra,
});

const result = (index: number, seconds: number, passed = true): ResultRow => ({
  attemptId: "a1",
  studentRut: "11111111",
  gameId: "color-sequence",
  key: `${index}.1`,
  index,
  tryNumber: 1,
  metrics: { sequenceLength: index + 1, correctCount: passed ? index + 1 : 0, passed },
  activeMsNet: seconds * 1000,
  completedAt: new Date("2026-10-02T15:30:00Z"),
});

describe("parseHistoryQuery", () => {
  it("sin nada pedido es la primera página sin filtro", () => {
    expect(parseHistoryQuery({})).toEqual({ ok: true, query: { page: 1, from: null, to: null } });
  });

  it("lee la página y las fechas", () => {
    expect(parseHistoryQuery({ page: "3", from: "2026-10-01", to: "2026-10-15" })).toEqual({
      ok: true,
      query: { page: 3, from: "2026-10-01", to: "2026-10-15" },
    });
  });

  it.each([["0"], ["-1"], ["1.5"], ["abc"], ["99999"]])("rechaza la página %s", (page) => {
    expect(parseHistoryQuery({ page }).ok).toBe(false);
  });

  it("rechaza una fecha que no existe o un rango al revés", () => {
    expect(parseHistoryQuery({ from: "2026-02-31" }).ok).toBe(false);
    expect(parseHistoryQuery({ to: "ayer" }).ok).toBe(false);
    expect(parseHistoryQuery({ from: "2026-10-15", to: "2026-10-01" }).ok).toBe(false);
  });
});

describe("historyWindow", () => {
  it("sin fechas no limita", () => {
    expect(historyWindow({ page: 1, from: null, to: null })).toEqual({ from: null, until: null });
  });

  it("toma días completos en hora de Chile: desde la medianoche del primero hasta la del día siguiente al último", () => {
    const { from, until } = historyWindow({ page: 1, from: "2026-10-01", to: "2026-10-01" });

    // Octubre en Chile es UTC-3.
    expect(from?.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(until?.toISOString()).toBe("2026-10-02T03:00:00.000Z");
  });
});

describe("outcomeOf", () => {
  it("terminada y fallida", () => {
    expect(outcomeOf(attempt(), NOW)).toBe("Terminada");
    expect(outcomeOf(attempt({ status: "failed" }), NOW)).toBe("Fallida");
  });

  it("una partida abierta no se llama abandonada: dice cuándo fue su última actividad", () => {
    const open = attempt({ status: "in_progress", lastActivityAt: new Date("2026-10-20T09:00:00Z") });

    expect(outcomeOf(open, NOW)).toBe("Sin terminar (última actividad hace 1 día)");
    expect(outcomeOf(attempt({ status: "in_progress", lastActivityAt: NOW }), NOW)).toBe("Sin terminar (activa hoy)");
  });
});

describe("historyRow", () => {
  it("trae juego, número, inicio, estado, resultados, mejor nivel y minutos activos", () => {
    const row = historyRow(attempt(), [result(1, 10), result(2, 20), result(3, 30, false)], NOW);

    // El nivel 3 no se aprobó: el mejor nivel es el 2. 60 s = 1 min.
    expect(row).toEqual(["Seriación de colores", 2, "2 oct 2026", "Terminada", 3, 2, 1]);
  });

  it("una partida sin resultados no tiene mejor nivel", () => {
    expect(historyRow(attempt({ status: "in_progress" }), [], NOW).slice(4)).toEqual([0, null, 0]);
  });
});

describe("historyPage", () => {
  it("calcula las páginas de a 10", () => {
    expect(HISTORY_PAGE_SIZE).toBe(10);
    expect(historyPage([], 0, 1)).toMatchObject({ columns: HISTORY_COLUMNS, total: 0, pages: 1 });
    expect(historyPage([], 10, 1).pages).toBe(1);
    expect(historyPage([], 11, 2).pages).toBe(2);
    expect(historyPage([], 95, 1).pages).toBe(10);
  });
});
