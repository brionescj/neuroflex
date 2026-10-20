import { describe, expect, it } from "vitest";

import { LEVELS } from "../levels";
import { nodeContentVersion, toNodeReport } from "./nodeReport";

const FALLBACK = "2026-10-14T12:00:00.000Z";

describe("toNodeReport", () => {
  it("arma el reporte de un nivel", () => {
    const report = toNodeReport(
      {
        level: 2,
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

  it("sin neto ni fecha usa el tiempo activo y la fecha de respaldo", () => {
    const report = toNodeReport(
      { level: 1, pairCount: 2, timeMs: 8_000, undoCount: 0, resetCount: 0 },
      FALLBACK,
    );

    expect(report.activeMsNet).toBe(8_000);
    expect(report.completedAt).toBe(FALLBACK);
  });

  it("el neto nunca supera al bruto", () => {
    const report = toNodeReport(
      {
        level: 1,
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
      { level: 1, pairCount: 2, timeMs: 1, undoCount: 2, resetCount: 0 },
      FALLBACK,
    );

    expect(report.metrics.corrections).toBe(2);
    expect(report.metrics.cellsErased).toBeUndefined();
    expect(report.metrics.strokesStarted).toBeUndefined();
  });
});

describe("nodeContentVersion", () => {
  it("es estable entre llamadas", () => {
    expect(nodeContentVersion()).toBe(nodeContentVersion());
  });

  it("incluye la cantidad de niveles", () => {
    expect(nodeContentVersion()).toMatch(new RegExp(`^nodes-${LEVELS.length}-[0-9a-f]+$`));
  });
});
