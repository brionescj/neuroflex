import { afterEach, describe, expect, it, vi } from "vitest";

import type { SequenceColorId } from "../components/ColorGrid";
import { buildSequence, startsTheSame } from "./colorSequenceBuild";

const seq = (...colors: SequenceColorId[]) => colors;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("startsTheSame", () => {
  it("detecta la misma secuencia y la que la extiende", () => {
    expect(startsTheSame(seq("red", "blue"), seq("red", "blue"))).toBe(true);
    expect(startsTheSame(seq("red", "blue", "green"), seq("red", "blue"))).toBe(true);
    expect(startsTheSame(seq("red", "blue"), seq("red", "blue", "green"))).toBe(true);
  });

  it("no la confunde con una que solo comparte algun color", () => {
    expect(startsTheSame(seq("red", "green", "blue"), seq("red", "blue"))).toBe(false);
    expect(startsTheSame(seq("green", "blue"), seq("red", "blue"))).toBe(false);
  });

  it("sin secuencia anterior no hay nada que comparar", () => {
    expect(startsTheSame(seq("red", "blue"), [])).toBe(false);
  });
});

describe("buildSequence", () => {
  it("devuelve el largo pedido y respeta las reglas de aleatoriedad", () => {
    for (let length = 2; length <= 40; length++) {
      for (let n = 0; n < 20; n++) {
        const s = buildSequence(length);

        expect(s).toHaveLength(length);
        s.forEach((color, i) => {
          if (i >= 1) expect(color).not.toBe(s[i - 1]);
          if (i >= 2) expect(color).not.toBe(s[i - 2]);
        });
      }
    }
  });

  it("el nivel siguiente nunca es la secuencia anterior mas un color", () => {
    let previous = buildSequence(2);

    for (let level = 2; level <= 300; level++) {
      const next = buildSequence(level + 1, previous);

      expect(next).toHaveLength(level + 1);
      expect(startsTheSame(next, previous)).toBe(false);
      previous = next;
    }
  });

  it("un reintento nunca repite la secuencia fallada", () => {
    for (let n = 0; n < 500; n++) {
      const failed = buildSequence(2);

      expect(buildSequence(2, failed).join()).not.toBe(failed.join());
    }
  });

  it("descarta un sorteo que extiende la secuencia anterior y vuelve a sortear", () => {
    // Orden de colores: blue, green, orange, red.
    // Sorteo 1: red, blue, green (extiende red-blue) -> se descarta.
    // Sorteo 2: green, blue, orange -> se acepta.
    const values = [0.8, 0, 0, 0.3, 0, 0];
    let i = 0;
    const random = vi
      .spyOn(Math, "random")
      .mockImplementation(() => values[i++] ?? 0);

    const next = buildSequence(3, seq("red", "blue"));

    expect(next).toEqual(["green", "blue", "orange"]);
    expect(random).toHaveBeenCalledTimes(6);
  });
});
