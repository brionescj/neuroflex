import { describe, expect, it } from "vitest";

import type { SequenceColorId } from "../components/ColorGrid";
import { TOTAL_LEVELS, type LevelResult } from "./colorSequenceConfig";
import {
  buildColorSequenceSnapshot,
  parseColorSequenceProgress,
} from "./colorSequenceResume";

const COLORS: SequenceColorId[] = ["blue", "green", "orange", "red"];

function seq(length: number): SequenceColorId[] {
  return Array.from({ length }, (_, i) => COLORS[i % COLORS.length]!);
}

function results(count: number): LevelResult[] {
  return Array.from({ length: count }, (_, i) => ({
    level: i + 1,
    sequenceLength: 2 + i,
    correctCount: 2 + i,
    timeMs: 1000,
  }));
}

describe("parseColorSequenceProgress", () => {
  it("acepta el inicio de un nivel (iluminando)", () => {
    // nivel 3 => secuencia de 4 colores y 2 resultados previos
    const snap = buildColorSequenceSnapshot("illuminating", 3, seq(4), results(2));
    expect(parseColorSequenceProgress(snap)).toEqual(snap);
  });

  it("acepta el resultado de un nivel", () => {
    const snap = buildColorSequenceSnapshot("level-result", 3, seq(4), results(3));
    expect(parseColorSequenceProgress(snap)).toEqual(snap);
  });

  it("acepta el final solo con todos los niveles", () => {
    const ok = buildColorSequenceSnapshot(
      "finished",
      TOTAL_LEVELS,
      seq(2 + TOTAL_LEVELS - 1),
      results(TOTAL_LEVELS),
    );
    expect(parseColorSequenceProgress(ok)).toEqual(ok);

    const incompleto = buildColorSequenceSnapshot("finished", 3, seq(4), results(3));
    expect(parseColorSequenceProgress(incompleto)).toBeNull();
  });

  it("rechaza basura, null y otra version", () => {
    expect(parseColorSequenceProgress(null)).toBeNull();
    expect(parseColorSequenceProgress({})).toBeNull();
    const snap = buildColorSequenceSnapshot("illuminating", 1, seq(2), []);
    expect(parseColorSequenceProgress({ ...snap, version: 9 })).toBeNull();
  });

  it("rechaza una secuencia cuyo largo no corresponde al nivel", () => {
    const snap = buildColorSequenceSnapshot("illuminating", 3, seq(5), results(2));
    expect(parseColorSequenceProgress(snap)).toBeNull();
  });

  it("rechaza colores que no existen", () => {
    const snap = buildColorSequenceSnapshot("illuminating", 1, seq(2), []);
    expect(
      parseColorSequenceProgress({ ...snap, sequence: ["blue", "morado"] }),
    ).toBeNull();
  });

  it("rechaza si la cantidad de resultados no cuadra con la fase", () => {
    const snap = buildColorSequenceSnapshot("illuminating", 3, seq(4), results(3));
    expect(parseColorSequenceProgress(snap)).toBeNull();
  });

  it("rechaza resultados que no son del nivel de su posicion", () => {
    const malos = results(2).map((r) => ({ ...r, level: 7 }));
    const snap = buildColorSequenceSnapshot("illuminating", 3, seq(4), malos);
    expect(parseColorSequenceProgress(snap)).toBeNull();
  });

  it("rechaza un nivel fuera de rango", () => {
    const snap = buildColorSequenceSnapshot("illuminating", 1, seq(2), []);
    expect(parseColorSequenceProgress({ ...snap, level: 0 })).toBeNull();
    expect(
      parseColorSequenceProgress({ ...snap, level: TOTAL_LEVELS + 1 }),
    ).toBeNull();
  });
});
