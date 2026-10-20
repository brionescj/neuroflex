import { describe, expect, it } from "vitest";

import { toColorSequenceReport } from "./colorSequenceReport";

const FALLBACK = "2026-10-14T12:00:00.000Z";

describe("toColorSequenceReport", () => {
  it("arma el reporte de un nivel con sus tiempos activos", () => {
    const report = toColorSequenceReport(
      {
        level: 3,
        sequenceLength: 4,
        correctCount: 3,
        timeMs: 4200,
        activeMsGross: 9000,
        activeMsNet: 8000,
        completedAt: "2026-10-14T11:00:00.000Z",
      },
      FALLBACK,
    );

    expect(report).toEqual({
      key: "3",
      index: 3,
      tryNumber: 1,
      metrics: { sequenceLength: 4, correctCount: 3, percent: 75, timeMs: 4200 },
      activeMsGross: 9000,
      activeMsNet: 8000,
      completedAt: "2026-10-14T11:00:00.000Z",
    });
  });

  it("un resultado antiguo usa el tiempo de respuesta y la fecha de respaldo", () => {
    const report = toColorSequenceReport(
      { level: 1, sequenceLength: 2, correctCount: 2, timeMs: 1500 },
      FALLBACK,
    );

    expect(report.activeMsGross).toBe(1500);
    expect(report.activeMsNet).toBe(1500);
    expect(report.completedAt).toBe(FALLBACK);
  });

  it("el neto nunca supera al bruto", () => {
    const report = toColorSequenceReport(
      {
        level: 1,
        sequenceLength: 2,
        correctCount: 1,
        timeMs: 1000,
        activeMsGross: 2000,
        activeMsNet: 5000,
      },
      FALLBACK,
    );

    expect(report.activeMsNet).toBe(2000);
  });

  it("el porcentaje se redondea", () => {
    const report = toColorSequenceReport(
      { level: 2, sequenceLength: 3, correctCount: 2, timeMs: 1 },
      FALLBACK,
    );

    expect(report.metrics.percent).toBe(67);
  });
});
