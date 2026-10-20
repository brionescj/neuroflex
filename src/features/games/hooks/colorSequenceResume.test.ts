import { describe, expect, it } from "vitest";

import type { SequenceColorId } from "../components/ColorGrid";
import { MAX_SAVED_LEVEL, type LevelResult } from "./colorSequenceConfig";
import {
  buildColorSequenceSnapshot,
  parseColorSequenceProgress,
} from "./colorSequenceResume";
import { requiredCorrect, sequenceLengthOf } from "./colorSequenceRules";

const COLORS: SequenceColorId[] = ["blue", "green", "orange", "red"];

function seq(length: number): SequenceColorId[] {
  return Array.from({ length }, (_, i) => COLORS[i % COLORS.length]!);
}

function result(level: number, tryNumber: number, passed: boolean): LevelResult {
  const length = sequenceLengthOf(level);
  const needed = requiredCorrect(level, length);

  return {
    level,
    tryNumber,
    passed,
    sequenceLength: length,
    correctCount: passed ? length : needed - 1,
    timeMs: 1000,
  };
}

/** Niveles 1..count pasados a la primera. */
function passedLevels(count: number): LevelResult[] {
  return Array.from({ length: count }, (_, i) => result(i + 1, 1, true));
}

/** Tres intentos fallidos en un nivel. */
function threeFails(level: number): LevelResult[] {
  return [1, 2, 3].map((t) => result(level, t, false));
}

describe("parseColorSequenceProgress", () => {
  it("acepta el inicio de un intento (iluminando)", () => {
    const snap = buildColorSequenceSnapshot("illuminating", 3, 1, seq(4), passedLevels(2));
    expect(parseColorSequenceProgress(snap)).toEqual(snap);
  });

  it("acepta el inicio de un reintento tras un intento fallido", () => {
    const results = [...passedLevels(2), result(3, 1, false)];
    const snap = buildColorSequenceSnapshot("illuminating", 3, 2, seq(4), results);
    expect(parseColorSequenceProgress(snap)).toEqual(snap);
  });

  it("acepta el resultado de un intento pasado o fallido", () => {
    const pasado = buildColorSequenceSnapshot("level-result", 3, 1, seq(4), passedLevels(3));
    expect(parseColorSequenceProgress(pasado)).toEqual(pasado);

    const fallado = buildColorSequenceSnapshot(
      "level-result", 3, 2, seq(4),
      [...passedLevels(2), result(3, 1, false), result(3, 2, false)],
    );
    expect(parseColorSequenceProgress(fallado)).toEqual(fallado);
  });

  it("acepta niveles mas alla del minimo: el juego no tiene tope", () => {
    const snap = buildColorSequenceSnapshot("illuminating", 15, 1, seq(16), passedLevels(14));
    expect(parseColorSequenceProgress(snap)).toEqual(snap);

    const res = buildColorSequenceSnapshot("level-result", 25, 1, seq(26), passedLevels(25));
    expect(parseColorSequenceProgress(res)).toEqual(res);
  });

  it("recalcula si el nivel se paso: no confia en el campo guardado", () => {
    const mentiroso = passedLevels(3).map((r, i) =>
      i === 2 ? { ...r, passed: false } : r,
    );
    const snap = buildColorSequenceSnapshot("level-result", 3, 1, seq(4), mentiroso);

    expect(parseColorSequenceProgress(snap)?.levelResults[2]?.passed).toBe(true);
  });

  describe("fin de la partida", () => {
    it("acepta terminar tras pasar los 10 niveles obligatorios", () => {
      const snap = buildColorSequenceSnapshot("finished", 10, 1, seq(11), passedLevels(10));
      expect(parseColorSequenceProgress(snap)).toEqual(snap);

      const mas = buildColorSequenceSnapshot("finished", 14, 1, seq(15), passedLevels(14));
      expect(parseColorSequenceProgress(mas)).toEqual(mas);
    });

    it("acepta terminar a mitad de un intento (ese intento no cuenta)", () => {
      const snap = buildColorSequenceSnapshot("finished", 12, 1, seq(13), passedLevels(11));
      expect(parseColorSequenceProgress(snap)).toEqual(snap);
    });

    it("acepta terminar entre dos intentos de un nivel desde el 11", () => {
      const results = [...passedLevels(11), result(12, 1, false)];
      const snap = buildColorSequenceSnapshot("finished", 12, 1, seq(13), results);
      expect(parseColorSequenceProgress(snap)).toEqual(snap);

      const siguiente = buildColorSequenceSnapshot("finished", 12, 2, seq(13), results);
      expect(parseColorSequenceProgress(siguiente)).toEqual(siguiente);
    });

    it("acepta el cierre por agotar los 3 intentos desde el nivel 11", () => {
      const results = [...passedLevels(12), ...threeFails(13)];
      const snap = buildColorSequenceSnapshot("finished", 13, 3, seq(14), results);
      expect(parseColorSequenceProgress(snap)).toEqual(snap);
    });

    it("rechaza terminar antes de pasar los 10 niveles obligatorios", () => {
      const pocos = buildColorSequenceSnapshot("finished", 9, 1, seq(10), passedLevels(9));
      expect(parseColorSequenceProgress(pocos)).toBeNull();

      // 9 pasados y a mitad del 10
      const mitad = buildColorSequenceSnapshot("finished", 10, 1, seq(11), passedLevels(9));
      expect(parseColorSequenceProgress(mitad)).toBeNull();

      // 10 niveles jugados, pero uno sin pasar
      const sinPasar = [...passedLevels(9), result(10, 1, false)];
      expect(
        parseColorSequenceProgress(
          buildColorSequenceSnapshot("finished", 10, 1, seq(11), sinPasar),
        ),
      ).toBeNull();
    });

    it("rechaza un final cuyo nivel no cuadra con los resultados", () => {
      const adelantado = buildColorSequenceSnapshot("finished", 13, 1, seq(14), passedLevels(11));
      expect(parseColorSequenceProgress(adelantado)).toBeNull();

      const atrasado = buildColorSequenceSnapshot("finished", 10, 1, seq(11), passedLevels(12));
      expect(parseColorSequenceProgress(atrasado)).toBeNull();
    });

    it("agotar los intentos en un nivel obligatorio no es un final, es un fallo", () => {
      const results = [...passedLevels(4), ...threeFails(5)];

      const comoFinal = buildColorSequenceSnapshot("finished", 5, 3, seq(6), results);
      expect(parseColorSequenceProgress(comoFinal)).toBeNull();

      const fallo = buildColorSequenceSnapshot("failed", 5, 3, seq(6), results);
      expect(parseColorSequenceProgress(fallo)).toEqual(fallo);
    });
  });

  describe("fallo de la partida", () => {
    it("acepta agotar los intentos en el nivel 1 y en el 10", () => {
      const nivel1 = buildColorSequenceSnapshot("failed", 1, 3, seq(2), threeFails(1));
      expect(parseColorSequenceProgress(nivel1)).toEqual(nivel1);

      const nivel10 = buildColorSequenceSnapshot(
        "failed", 10, 3, seq(11), [...passedLevels(9), ...threeFails(10)],
      );
      expect(parseColorSequenceProgress(nivel10)).toEqual(nivel10);
    });

    it("rechaza un fallo sin los 3 intentos o desde el nivel 11", () => {
      const dos = [...passedLevels(4), result(5, 1, false), result(5, 2, false)];
      expect(
        parseColorSequenceProgress(buildColorSequenceSnapshot("failed", 5, 2, seq(6), dos)),
      ).toBeNull();

      const tarde = [...passedLevels(10), ...threeFails(11)];
      expect(
        parseColorSequenceProgress(buildColorSequenceSnapshot("failed", 11, 3, seq(12), tarde)),
      ).toBeNull();
    });

    it("un avance en curso no puede seguir despues de agotar los intentos", () => {
      const results = [...passedLevels(4), ...threeFails(5)];
      const snap = buildColorSequenceSnapshot("illuminating", 5, 3, seq(6), results);
      expect(parseColorSequenceProgress(snap)).toBeNull();

      const resultado = buildColorSequenceSnapshot("level-result", 5, 3, seq(6), results);
      expect(parseColorSequenceProgress(resultado)).toBeNull();
    });
  });

  describe("avances guardados antes de los reintentos (version 1)", () => {
    const v1Results = (count: number) =>
      passedLevels(count).map(({ tryNumber: _t, passed: _p, ...rest }) => rest);

    it("se leen como niveles pasados a la primera", () => {
      const parsed = parseColorSequenceProgress({
        version: 1,
        phase: "level-result",
        level: 3,
        sequence: seq(4),
        levelResults: v1Results(3),
      });

      expect(parsed?.version).toBe(2);
      expect(parsed?.tryNumber).toBe(1);
      expect(parsed?.levelResults.every((r) => r.passed && r.tryNumber === 1)).toBe(true);
    });

    it("un nivel flojo guardado entonces sigue siendo valido", () => {
      const results = v1Results(3).map((r, i) => (i === 1 ? { ...r, correctCount: 1 } : r));
      const parsed = parseColorSequenceProgress({
        version: 1,
        phase: "illuminating",
        level: 4,
        sequence: seq(5),
        levelResults: results,
      });

      expect(parsed).not.toBeNull();
      expect(parsed?.levelResults[1]?.passed).toBe(true);
    });

    it("un final de entonces con los niveles minimos se acepta", () => {
      const parsed = parseColorSequenceProgress({
        version: 1,
        phase: "finished",
        level: 11,
        sequence: seq(12),
        levelResults: v1Results(10),
      });

      expect(parsed?.phase).toBe("finished");
    });
  });

  it("rechaza basura, null y otra version", () => {
    expect(parseColorSequenceProgress(null)).toBeNull();
    expect(parseColorSequenceProgress({})).toBeNull();
    const snap = buildColorSequenceSnapshot("illuminating", 1, 1, seq(2), []);
    expect(parseColorSequenceProgress({ ...snap, version: 9 })).toBeNull();
  });

  it("rechaza un intento fuera de 1 a 3 o ausente", () => {
    const snap = buildColorSequenceSnapshot("illuminating", 1, 1, seq(2), []);
    expect(parseColorSequenceProgress({ ...snap, tryNumber: 0 })).toBeNull();
    expect(parseColorSequenceProgress({ ...snap, tryNumber: 4 })).toBeNull();
    expect(parseColorSequenceProgress({ ...snap, tryNumber: undefined })).toBeNull();
  });

  it("rechaza una secuencia cuyo largo no corresponde al nivel", () => {
    const snap = buildColorSequenceSnapshot("illuminating", 3, 1, seq(5), passedLevels(2));
    expect(parseColorSequenceProgress(snap)).toBeNull();
  });

  it("rechaza colores que no existen", () => {
    const snap = buildColorSequenceSnapshot("illuminating", 1, 1, seq(2), []);
    expect(
      parseColorSequenceProgress({ ...snap, sequence: ["blue", "morado"] }),
    ).toBeNull();
  });

  it("rechaza si la cantidad de resultados no cuadra con la fase", () => {
    const snap = buildColorSequenceSnapshot("illuminating", 3, 1, seq(4), passedLevels(3));
    expect(parseColorSequenceProgress(snap)).toBeNull();
  });

  it("rechaza resultados que no son el nivel e intento de su posicion", () => {
    const malos = passedLevels(2).map((r) => ({ ...r, level: 7 }));
    const snap = buildColorSequenceSnapshot("illuminating", 3, 1, seq(4), malos);
    expect(parseColorSequenceProgress(snap)).toBeNull();

    // un reintento tras haber pasado el nivel
    const repetido = [...passedLevels(2), result(2, 2, true)];
    expect(
      parseColorSequenceProgress(
        buildColorSequenceSnapshot("level-result", 2, 2, seq(3), repetido),
      ),
    ).toBeNull();
  });

  it("rechaza un resultado con el largo de otro nivel", () => {
    const malo = passedLevels(2).map((r, i) => (i === 1 ? { ...r, sequenceLength: 9 } : r));
    const snap = buildColorSequenceSnapshot("illuminating", 3, 1, seq(4), malo);
    expect(parseColorSequenceProgress(snap)).toBeNull();
  });

  it("rechaza un nivel fuera de rango", () => {
    const snap = buildColorSequenceSnapshot("illuminating", 1, 1, seq(2), []);
    expect(parseColorSequenceProgress({ ...snap, level: 0 })).toBeNull();
    expect(
      parseColorSequenceProgress({ ...snap, level: MAX_SAVED_LEVEL + 1 }),
    ).toBeNull();
    expect(parseColorSequenceProgress({ ...snap, level: 2.5 })).toBeNull();
  });
});
