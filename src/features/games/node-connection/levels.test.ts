import { describe, expect, it } from "vitest";

import { NODE_COLORS } from "./colors";
import { LEVELS, TOTAL_LEVELS } from "./levels";
import { parseLevel } from "./levelParser";
import { solveLevel } from "./levelSolver";

describe("parseLevel", () => {
  it("lee nodos y tamano", () => {
    const level = parseLevel(3, ["R.B", "...", "RB."]);

    expect(level.id).toBe(3);
    expect(level.rows).toBe(3);
    expect(level.cols).toBe(3);
    expect(level.pairs).toHaveLength(2);
    expect(level.pairs[0]).toEqual({
      color: "red",
      a: { row: 0, col: 0 },
      b: { row: 2, col: 0 },
    });
  });

  it("falla si un color no tiene exactamente dos nodos", () => {
    expect(() => parseLevel(1, ["RR.", "R.."])).toThrow(/exactamente 2/);
    expect(() => parseLevel(1, ["R..", "..."])).toThrow(/exactamente 2/);
  });

  it("falla ante caracteres desconocidos, filas desiguales o tablero vacio", () => {
    expect(() => parseLevel(1, ["R.Z", "R.Z"])).toThrow(/desconocido/);
    expect(() => parseLevel(1, ["RR", "..."])).toThrow(/mismo largo/);
    expect(() => parseLevel(1, [])).toThrow(/vacio/);
    expect(() => parseLevel(1, ["...", "..."])).toThrow(/ningun par/);
  });
});

describe("solucionador (verificacion de la herramienta)", () => {
  it("encuentra solucion cuando existe", () => {
    expect(solveLevel(parseLevel(1, ["R.R", "...", "B.B"]))).toBe("solved");
  });

  it("detecta un tablero sin solucion", () => {
    // Los dos pares se cruzan en un tablero de 2x2.
    expect(solveLevel(parseLevel(1, ["RB", "BR"]))).toBe("unsolvable");
  });
});

describe("los niveles del entrenamiento", () => {
  it("son 15 y empiezan con 2 pares", () => {
    expect(TOTAL_LEVELS).toBe(15);
    expect(LEVELS[0]?.pairs).toHaveLength(2);
  });

  it("estan numerados en orden", () => {
    expect(LEVELS.map((l) => l.id)).toEqual(
      Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1),
    );
  });

  it("la dificultad no baja: ni el tamano ni el numero de pares", () => {
    for (let i = 1; i < LEVELS.length; i++) {
      const prev = LEVELS[i - 1];
      const cur = LEVELS[i];

      expect(cur!.rows * cur!.cols).toBeGreaterThanOrEqual(
        prev!.rows * prev!.cols,
      );
      expect(cur!.pairs.length).toBeGreaterThanOrEqual(prev!.pairs.length);
    }

    const first = LEVELS[0]!;
    const last = LEVELS[LEVELS.length - 1]!;
    expect(last.pairs.length).toBeGreaterThan(first.pairs.length);
    expect(last.rows * last.cols).toBeGreaterThan(first.rows * first.cols);
  });

  it("no usan mas colores de los que existen y son cuadrados", () => {
    for (const level of LEVELS) {
      expect(level.pairs.length).toBeLessThanOrEqual(NODE_COLORS.length);
      expect(level.rows).toBe(level.cols);
    }
  });

  it("ningun par tiene sus nodos pegados (seria un nivel regalado)", () => {
    for (const level of LEVELS) {
      for (const pair of level.pairs) {
        const distance =
          Math.abs(pair.a.row - pair.b.row) + Math.abs(pair.a.col - pair.b.col);

        expect(distance).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it.each(LEVELS.map((level) => [level.id, level] as const))(
    "el nivel %i tiene solucion",
    (_id, level) => {
      expect(solveLevel(level)).toBe("solved");
    },
  );
});
