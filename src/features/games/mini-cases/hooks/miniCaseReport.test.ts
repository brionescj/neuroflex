import { describe, expect, it } from "vitest";

import type { MiniCaseResult } from "../types";
import { toMiniCaseReport, toMiniCaseReports } from "./miniCaseReport";

const FALLBACK = "2026-10-14T12:00:00.000Z";

function makeResult(overrides: Partial<MiniCaseResult> = {}): MiniCaseResult {
  return {
    caseKey: "caso-1",
    correctSteps: 3,
    isFullyCorrect: false,
    decisionTimeMs: 9000,
    orderedOptionKeys: ["a", "b", "c", "d"],
    activeMsNet: 7000,
    completedAt: "2026-10-14T11:00:00.000Z",
    ...overrides,
  };
}

describe("toMiniCaseReport", () => {
  it("arma el reporte con el orden elegido", () => {
    expect(toMiniCaseReport(makeResult(), 2, FALLBACK)).toEqual({
      key: "caso-1",
      index: 2,
      tryNumber: 1,
      metrics: { decisionTimeMs: 9000 },
      activeMsGross: 9000,
      activeMsNet: 7000,
      completedAt: "2026-10-14T11:00:00.000Z",
      orderedOptionKeys: ["a", "b", "c", "d"],
    });
  });

  it("lleva el comportamiento al ordenar como parte de las metricas", () => {
    const behavior = {
      displayedOptionKeys: ["d", "b", "a", "c"],
      taps: 5,
      removals: 1,
      firstTapMs: 1200,
      twistReadMs: 3500,
      wallMs: 9800,
      distractorMotif: "gato",
      distractorSound: "meow",
      selectionLog: [{ o: "a", a: "add" as const, t: 1200 }],
    };
    const report = toMiniCaseReport(makeResult({ behavior }), 1, FALLBACK);

    expect(report?.metrics).toEqual({ decisionTimeMs: 9000, ...behavior });
  });

  it("devuelve null si no se guardo el orden (partida antigua)", () => {
    const { orderedOptionKeys: _omit, ...legacy } = makeResult();

    expect(toMiniCaseReport(legacy, 1, FALLBACK)).toBeNull();
  });

  it("sin neto ni fecha usa el bruto y la fecha de respaldo", () => {
    const { activeMsNet: _n, completedAt: _c, ...partial } = makeResult();
    const report = toMiniCaseReport(partial, 1, FALLBACK);

    expect(report?.activeMsNet).toBe(9000);
    expect(report?.completedAt).toBe(FALLBACK);
  });

  it("el neto nunca supera al bruto", () => {
    const report = toMiniCaseReport(makeResult({ activeMsNet: 99_000 }), 1, FALLBACK);

    expect(report?.activeMsNet).toBe(9000);
  });
});

describe("toMiniCaseReports", () => {
  it("numera por posicion y omite los resultados sin orden", () => {
    const { orderedOptionKeys: _omit, ...legacy } = makeResult({ caseKey: "caso-2" });
    const reports = toMiniCaseReports([
      makeResult({ caseKey: "caso-1" }),
      legacy,
      makeResult({ caseKey: "caso-3" }),
    ]);

    expect(reports.map((r) => [r.key, r.index])).toEqual([
      ["caso-1", 1],
      ["caso-3", 3],
    ]);
  });
});
