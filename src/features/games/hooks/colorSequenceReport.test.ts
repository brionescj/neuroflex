import { describe, expect, it } from "vitest";

import type { LevelResult } from "./colorSequenceConfig";
import {
  colorSequenceResultKey,
  toColorSequenceReport,
} from "./colorSequenceReport";

const FALLBACK = "2026-10-14T12:00:00.000Z";

function result(partial: Partial<LevelResult>): LevelResult {
  return {
    level: 1,
    tryNumber: 1,
    passed: true,
    sequenceLength: 2,
    correctCount: 2,
    timeMs: 1000,
    ...partial,
  };
}

describe("toColorSequenceReport: toques de la respuesta", () => {
  const withTaps = result({
    level: 2,
    sequenceLength: 3,
    correctCount: 2,
    shown: ["blue", "red", "green"],
    illuminationMs: 2700,
    taps: [
      { c: "blue", t: 900 },
      { c: "green", t: 1700 },
      { c: "green", t: 2600 },
    ],
  });

  it("lleva la secuencia mostrada en las metricas y los toques como eventos", () => {
    const report = toColorSequenceReport(withTaps, FALLBACK);

    expect(report.metrics).toMatchObject({
      shownSequence: ["blue", "red", "green"],
      illuminationMs: 2700,
    });
    expect(report.events).toEqual([
      { c: "blue", t: 900 },
      { c: "green", t: 1700 },
      { c: "green", t: 2600 },
    ]);
  });

  it("un resultado antiguo (sin toques) no inventa nada", () => {
    const report = toColorSequenceReport(result({}), FALLBACK);

    expect(report.metrics).not.toHaveProperty("shownSequence");
    expect(report).not.toHaveProperty("events");
  });

  it("si los toques no son uno por color, no se informan", () => {
    const report = toColorSequenceReport(
      { ...withTaps, taps: withTaps.taps?.slice(0, 2) },
      FALLBACK,
    );

    expect(report).not.toHaveProperty("events");
    expect(report.metrics).not.toHaveProperty("shownSequence");
  });
});

describe("toColorSequenceReport", () => {
  it("arma el reporte de un intento con su umbral y sus tiempos activos", () => {
    const report = toColorSequenceReport(
      result({
        level: 3,
        sequenceLength: 4,
        correctCount: 3,
        timeMs: 4200,
        activeMsGross: 9000,
        activeMsNet: 8000,
        completedAt: "2026-10-14T11:00:00.000Z",
      }),
      FALLBACK,
    );

    expect(report).toEqual({
      key: "3",
      index: 3,
      tryNumber: 1,
      metrics: {
        sequenceLength: 4,
        correctCount: 3,
        percent: 75,
        thresholdPercent: 60,
        passed: true,
        timeMs: 4200,
      },
      activeMsGross: 9000,
      activeMsNet: 8000,
      completedAt: "2026-10-14T11:00:00.000Z",
    });
  });

  it("un reintento lleva su numero de intento en la clave", () => {
    const report = toColorSequenceReport(
      result({ level: 9, tryNumber: 2, sequenceLength: 10, correctCount: 8, passed: false }),
      FALLBACK,
    );

    expect(report.key).toBe("9.2");
    expect(report.index).toBe(9);
    expect(report.tryNumber).toBe(2);
    expect(report.metrics).toMatchObject({ passed: false, thresholdPercent: 90, percent: 80 });
  });

  it("un resultado antiguo usa el tiempo de respuesta y la fecha de respaldo", () => {
    const report = toColorSequenceReport(result({ timeMs: 1500 }), FALLBACK);

    expect(report.activeMsGross).toBe(1500);
    expect(report.activeMsNet).toBe(1500);
    expect(report.completedAt).toBe(FALLBACK);
  });

  it("el neto nunca supera al bruto", () => {
    const report = toColorSequenceReport(
      result({ correctCount: 1, passed: false, activeMsGross: 2000, activeMsNet: 5000 }),
      FALLBACK,
    );

    expect(report.activeMsNet).toBe(2000);
  });

  it("el porcentaje se redondea", () => {
    const report = toColorSequenceReport(
      result({ level: 2, sequenceLength: 3, correctCount: 2 }),
      FALLBACK,
    );

    expect(report.metrics.percent).toBe(67);
  });
});

describe("colorSequenceResultKey", () => {
  it("el primer intento conserva la clave de siempre y los demas la extienden", () => {
    expect(colorSequenceResultKey(5, 1)).toBe("5");
    expect(colorSequenceResultKey(5, 2)).toBe("5.2");
    expect(colorSequenceResultKey(12, 3)).toBe("12.3");
  });

  it("nunca repite una clave entre intentos y niveles", () => {
    const keys = new Set<string>();

    for (let level = 1; level <= 30; level++) {
      for (let t = 1; t <= 3; t++) keys.add(colorSequenceResultKey(level, t));
    }

    expect(keys.size).toBe(90);
  });
});
