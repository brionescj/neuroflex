import { describe, expect, it } from "vitest";

import { splitPercent } from "./numbers";

const sum = (values: (number | null)[]) =>
  Math.round(values.reduce<number>((acc, value) => acc + (value ?? 0), 0) * 10) / 10;

describe("splitPercent", () => {
  it("tres partes iguales suman exactamente 100,0", () => {
    const result = splitPercent([1, 1, 1], 3);

    expect(result).toEqual([33.4, 33.3, 33.3]);
    expect(sum(result)).toBe(100);
  });

  it("siete partes iguales: redondeadas por separado suman 100,1; juntas, 100,0", () => {
    const parts = [1, 1, 1, 1, 1, 1, 1];
    const naive = parts.map((part) => Math.round((part / 7) * 1000) / 10);

    expect(sum(naive)).not.toBe(100);
    expect(sum(splitPercent(parts, 7))).toBe(100);
  });

  it("siempre suma 100,0 y nunca se aleja más de 0,1 del redondeo simple", () => {
    let seed = 12345;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;

      return seed / 2147483648;
    };

    for (let round = 0; round < 500; round++) {
      const size = 2 + Math.floor(next() * 8);
      const parts = Array.from({ length: size }, () => Math.floor(next() * 30));
      const total = parts.reduce((acc, part) => acc + part, 0);

      if (total === 0) continue;

      const result = splitPercent(parts, total) as number[];

      expect(sum(result)).toBe(100);

      result.forEach((value, i) => {
        const exact = ((parts[i] as number) / total) * 100;

        expect(Math.abs(value - exact)).toBeLessThan(0.1 + 1e-9);
      });
    }
  });

  it("una parte con todo el total es 100,0 y el resto 0", () => {
    expect(splitPercent([0, 5, 0], 5)).toEqual([0, 100, 0]);
  });

  it("sin total no hay porcentajes", () => {
    expect(splitPercent([0, 0], 0)).toEqual([null, null]);
  });

  it("si las partes no cubren el total, cada una se redondea sola", () => {
    // 2 de 3 niveles tienen categoría; el resto no está en el gráfico y no debe forzar el 100.
    expect(splitPercent([1, 1], 3)).toEqual([33.3, 33.3]);
  });
});
