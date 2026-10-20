import { describe, expect, it } from "vitest";

import type { SequenceColorId } from "../components/ColorGrid";
import {
  MAX_SAVED_LEVEL,
  MIN_LEVELS,
  type LevelResult,
} from "./colorSequenceConfig";
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

  it("acepta niveles mas alla del minimo: el juego no tiene tope", () => {
    // nivel 15 => secuencia de 16 colores y 14 resultados previos
    const snap = buildColorSequenceSnapshot("illuminating", 15, seq(16), results(14));
    expect(parseColorSequenceProgress(snap)).toEqual(snap);

    const result = buildColorSequenceSnapshot("level-result", 25, seq(26), results(25));
    expect(parseColorSequenceProgress(result)).toEqual(result);
  });

  it("acepta el final tras completar el minimo de niveles", () => {
    const exact = buildColorSequenceSnapshot("finished", MIN_LEVELS, seq(11), results(MIN_LEVELS));
    expect(parseColorSequenceProgress(exact)).toEqual(exact);

    const mas = buildColorSequenceSnapshot("finished", 14, seq(15), results(14));
    expect(parseColorSequenceProgress(mas)).toEqual(mas);
  });

  it("acepta el final a mitad de un nivel (ese nivel no cuenta)", () => {
    // 11 niveles hechos y terminando en el 12 sin completarlo
    const snap = buildColorSequenceSnapshot("finished", 12, seq(13), results(11));
    expect(parseColorSequenceProgress(snap)).toEqual(snap);
  });

  it("rechaza el final antes del minimo de niveles", () => {
    const pocos = buildColorSequenceSnapshot("finished", 9, seq(10), results(9));
    expect(parseColorSequenceProgress(pocos)).toBeNull();

    // 9 hechos y a mitad del 10: tampoco alcanza
    const mitad = buildColorSequenceSnapshot("finished", 10, seq(11), results(9));
    expect(parseColorSequenceProgress(mitad)).toBeNull();
  });

  it("rechaza un final cuyo nivel no cuadra con los resultados", () => {
    const adelantado = buildColorSequenceSnapshot("finished", 13, seq(14), results(11));
    expect(parseColorSequenceProgress(adelantado)).toBeNull();

    const atrasado = buildColorSequenceSnapshot("finished", 10, seq(11), results(12));
    expect(parseColorSequenceProgress(atrasado)).toBeNull();
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
      parseColorSequenceProgress({ ...snap, level: MAX_SAVED_LEVEL + 1 }),
    ).toBeNull();
    expect(parseColorSequenceProgress({ ...snap, level: 2.5 })).toBeNull();
  });
});
