import { describe, expect, it } from "vitest";

import { LEVELS } from "../levels";
import { nodeContentVersion, toNodeReport } from "./nodeReport";

const FALLBACK = "2026-10-14T12:00:00.000Z";

describe("toNodeReport", () => {
  it("arma el reporte de un nivel", () => {
    const report = toNodeReport(
      {
        level: 2,
        tryNumber: 1,
        solved: true,
        passed: true,
        pairCount: 3,
        timeMs: 20_000,
        undoCount: 1,
        resetCount: 2,
        activeMsNet: 15_000,
        completedAt: "2026-10-14T11:00:00.000Z",
      },
      FALLBACK,
    );

    expect(report).toMatchObject({
      key: "2",
      index: 2,
      tryNumber: 1,
      activeMsGross: 20_000,
      activeMsNet: 15_000,
      completedAt: "2026-10-14T11:00:00.000Z",
      metrics: { pairCount: 3, undoCount: 1, resetCount: 2 },
    });
    expect(report.metrics.boardSize).toBe(LEVELS[1]?.rows);
  });

  it("lleva la bitacora como eventos y avisa si quedo incompleta", () => {
    const report = toNodeReport(
      {
        level: 1,
        tryNumber: 1,
        solved: true,
        passed: true,
        pairCount: 2,
        timeMs: 8_000,
        undoCount: 0,
        resetCount: 0,
        events: [
          { t: 3100, type: "start", color: "red", row: 0, col: 3 },
          { t: 4000, type: "end", color: "red", len: 3, done: true, back: 0 },
        ],
        eventsDropped: 12,
      },
      FALLBACK,
    );

    expect(report.events).toEqual([
      { t: 3100, type: "start", color: "red", row: 0, col: 3 },
      { t: 4000, type: "end", color: "red", len: 3, done: true, back: 0 },
    ]);
    expect(report.metrics.eventsDropped).toBe(12);
  });

  it("los eventos no llevan campos indefinidos", () => {
    const report = toNodeReport(
      {
        level: 1,
        tryNumber: 1,
        solved: true,
        passed: true,
        pairCount: 2,
        timeMs: 8_000,
        undoCount: 0,
        resetCount: 0,
        events: [{ t: 10, type: "start", color: "red", row: 0, col: 0, restartCells: undefined }],
      },
      FALLBACK,
    );

    expect(Object.keys(report.events?.[0] ?? {}).sort()).toEqual(["col", "color", "row", "t", "type"]);
  });

  it("un nivel antiguo (sin bitacora) no inventa eventos", () => {
    const report = toNodeReport(
      { level: 1, tryNumber: 1, solved: true, passed: true, pairCount: 2, timeMs: 8_000, undoCount: 0, resetCount: 0 },
      FALLBACK,
    );

    expect(report).not.toHaveProperty("events");
    expect(report.metrics).not.toHaveProperty("eventsDropped");
  });

  it("sin neto ni fecha usa el tiempo activo y la fecha de respaldo", () => {
    const report = toNodeReport(
      { level: 1, tryNumber: 1, solved: true, passed: true, pairCount: 2, timeMs: 8_000, undoCount: 0, resetCount: 0 },
      FALLBACK,
    );

    expect(report.activeMsNet).toBe(8_000);
    expect(report.completedAt).toBe(FALLBACK);
  });

  it("el neto nunca supera al bruto", () => {
    const report = toNodeReport(
      {
        level: 1,
        tryNumber: 1,
        solved: true,
        passed: true,
        pairCount: 2,
        timeMs: 8_000,
        undoCount: 0,
        resetCount: 0,
        activeMsNet: 99_000,
      },
      FALLBACK,
    );

    expect(report.activeMsNet).toBe(8_000);
  });
});

describe("toNodeReport con contadores", () => {
  it("incluye los contadores, las celdas borradas y las correcciones", () => {
    const report = toNodeReport(
      {
        level: 1,
        tryNumber: 1,
        solved: true,
        passed: true,
        pairCount: 2,
        timeMs: 9_000,
        undoCount: 1,
        resetCount: 1,
        stats: {
          strokesStarted: 6,
          backtrackCells: 2,
          backtrackGestures: 2,
          routeRestarts: 1,
          restartCells: 3,
          resetCells: 4,
          blockedCount: 5,
        },
      },
      FALLBACK,
    );

    expect(report.metrics).toMatchObject({
      strokesStarted: 6,
      backtrackCells: 2,
      resetCells: 4,
      blockedCount: 5,
      cellsErased: 9,
      // deshacer 1 + rehacer tablero 1 + rutas rehechas 1 + gestos con retroceso 2
      corrections: 5,
    });
  });

  it("sin contadores no inventa ceros", () => {
    const report = toNodeReport(
      { level: 1, tryNumber: 1, solved: true, passed: true, pairCount: 2, timeMs: 1, undoCount: 2, resetCount: 0 },
      FALLBACK,
    );

    expect(report.metrics.corrections).toBe(2);
    expect(report.metrics.cellsErased).toBeUndefined();
    expect(report.metrics.strokesStarted).toBeUndefined();
  });
});

describe("toNodeReport: intentos y errores", () => {
  const stats = {
    strokesStarted: 5,
    backtrackCells: 0,
    backtrackGestures: 0,
    routeRestarts: 0,
    restartCells: 0,
    resetCells: 4,
    blockedCount: 3,
  };

  it("un intento perdido lleva su numero, su clave y los errores", () => {
    const report = toNodeReport(
      {
        level: 4,
        tryNumber: 2,
        solved: false,
        passed: false,
        pairCount: 4,
        timeMs: 9_000,
        undoCount: 0,
        resetCount: 2,
        stats,
      },
      FALLBACK,
    );

    expect(report.key).toBe("4.2");
    expect(report.index).toBe(4);
    expect(report.tryNumber).toBe(2);
    // 3 choques + 2 rehacer tablero x 2 = 7; en el nivel 4 se permiten 4 pares x 100 % = 4.
    expect(report.metrics).toMatchObject({
      solved: false,
      passed: false,
      errors: 7,
      errorsAllowed: 4,
    });
  });

  it("el primer intento conserva la clave de siempre", () => {
    const report = toNodeReport(
      {
        level: 7,
        tryNumber: 1,
        solved: true,
        passed: true,
        pairCount: 5,
        timeMs: 9_000,
        undoCount: 0,
        resetCount: 0,
        stats: { ...stats, blockedCount: 1 },
      },
      FALLBACK,
    );

    expect(report.key).toBe("7");
    expect(report.metrics).toMatchObject({ errors: 1, errorsAllowed: 3, passed: true });
  });

  it("sin contadores (partida antigua) no inventa errores", () => {
    const report = toNodeReport(
      {
        level: 2,
        tryNumber: 1,
        solved: true,
        passed: true,
        pairCount: 3,
        timeMs: 9_000,
        undoCount: 0,
        resetCount: 0,
      },
      FALLBACK,
    );

    expect(report.metrics).not.toHaveProperty("errors");
    expect(report.metrics).not.toHaveProperty("errorsAllowed");
    expect(report.metrics.passed).toBe(true);
  });
});

describe("nodeContentVersion", () => {
  it("es estable entre llamadas", () => {
    expect(nodeContentVersion()).toBe(nodeContentVersion());
  });

  it("incluye la cantidad de niveles", () => {
    expect(nodeContentVersion()).toMatch(new RegExp(`^nodes-${LEVELS.length}-[0-9a-f]+-r\\d+$`));
  });
});
