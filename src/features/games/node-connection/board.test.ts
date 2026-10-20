import { describe, expect, it } from "vitest";

import {
  advanceStroke,
  arePathsValid,
  connectedCount,
  extendStroke,
  isPathComplete,
  isSolved,
  pointToCell,
  startStroke,
} from "./board";
import { parseLevel } from "./levelParser";
import type { Cell, NodePaths } from "./types";

// R: (0,0) y (2,0)    B: (0,2) y (2,1)
const level = parseLevel(1, ["R.B", "...", "RB."]);

const c = (row: number, col: number): Cell => ({ row, col });

function moved(result: ReturnType<typeof extendStroke>): NodePaths {
  if (result.kind !== "moved") throw new Error("se esperaba un movimiento");
  return result.paths;
}

describe("startStroke", () => {
  it("empieza un trazo nuevo al tocar un nodo", () => {
    const started = startStroke(level, {}, c(0, 0));

    expect(started?.color).toBe("red");
    expect(started?.paths.red).toEqual([c(0, 0)]);
  });

  it("no hace nada sobre una celda vacia ni fuera del tablero", () => {
    expect(startStroke(level, {}, c(1, 1))).toBeNull();
    expect(startStroke(level, {}, c(9, 9))).toBeNull();
    expect(startStroke(level, {}, c(-1, 0))).toBeNull();
  });

  it("al tocar la cabeza de un trazo incompleto lo continua sin cambiarlo", () => {
    const paths: NodePaths = { red: [c(0, 0), c(0, 1)] };
    const started = startStroke(level, paths, c(0, 1));

    expect(started?.color).toBe("red");
    expect(started?.paths).toBe(paths);
  });

  it("al tocar el medio de un trazo lo acorta hasta ahi", () => {
    const paths: NodePaths = { red: [c(0, 0), c(1, 0), c(1, 1)] };
    const started = startStroke(level, paths, c(1, 0));

    expect(started?.paths.red).toEqual([c(0, 0), c(1, 0)]);
  });

  it("al tocar el otro nodo de un trazo completo empieza de nuevo desde ahi", () => {
    const paths: NodePaths = { red: [c(0, 0), c(1, 0), c(2, 0)] };
    const started = startStroke(level, paths, c(2, 0));

    expect(started?.paths.red).toEqual([c(2, 0)]);
  });

  it("al tocar un nodo cuyo par tenia un trazo a medias lo reemplaza", () => {
    const paths: NodePaths = { red: [c(0, 0), c(1, 0)] };
    const started = startStroke(level, paths, c(2, 0));

    expect(started?.paths.red).toEqual([c(2, 0)]);
  });
});

describe("extendStroke", () => {
  const base: NodePaths = { red: [c(0, 0)] };

  it("avanza a una celda libre vecina", () => {
    expect(moved(extendStroke(level, base, "red", c(0, 1))).red).toEqual([
      c(0, 0),
      c(0, 1),
    ]);
  });

  it("rechaza una celda que no es vecina de la cabeza", () => {
    expect(extendStroke(level, base, "red", c(1, 1)).kind).toBe("blocked");
    expect(extendStroke(level, base, "red", c(0, 2)).kind).toBe("blocked");
  });

  it("no entra en un nodo de otro color", () => {
    const paths: NodePaths = { red: [c(0, 0), c(0, 1)] };

    expect(extendStroke(level, paths, "red", c(0, 2)).kind).toBe("blocked");
  });

  it("no entra en el trazo de otro color", () => {
    const paths: NodePaths = {
      red: [c(0, 0), c(0, 1)],
      blue: [c(2, 1), c(1, 1)],
    };

    expect(extendStroke(level, paths, "red", c(1, 1)).kind).toBe("blocked");
  });

  it("volver sobre la celda anterior acorta el trazo", () => {
    const paths: NodePaths = { red: [c(0, 0), c(0, 1), c(1, 1)] };

    expect(moved(extendStroke(level, paths, "red", c(0, 1))).red).toEqual([
      c(0, 0),
      c(0, 1),
    ]);
  });

  it("cruzar el propio trazo lo recorta hasta ese punto", () => {
    const paths: NodePaths = { red: [c(0, 0), c(0, 1), c(1, 1), c(1, 0)] };

    expect(moved(extendStroke(level, paths, "red", c(0, 0))).red).toEqual([
      c(0, 0),
    ]);
  });

  it("completa el par al llegar a su otro nodo", () => {
    const paths: NodePaths = { red: [c(0, 0), c(1, 0)] };
    const next = moved(extendStroke(level, paths, "red", c(2, 0)));

    expect(isPathComplete(level, next, "red")).toBe(true);
  });

  it("un trazo completo no admite mas celdas pero si se puede acortar", () => {
    // Aqui la celda vecina de la cabeza (2,1) esta libre: el unico motivo para
    // rechazarla es que el trazo ya esta completo.
    const open = parseLevel(1, ["R..", "...", "R.."]);
    const paths: NodePaths = { red: [c(0, 0), c(1, 0), c(2, 0)] };

    expect(extendStroke(open, paths, "red", c(2, 1)).kind).toBe("blocked");
    expect(moved(extendStroke(open, paths, "red", c(1, 0))).red).toEqual([
      c(0, 0),
      c(1, 0),
    ]);
  });
});

describe("advanceStroke", () => {
  it("no se salta celdas cuando el puntero avanza varias de golpe", () => {
    const result = advanceStroke(level, { red: [c(0, 0)] }, "red", c(1, 1));

    // eje con mayor distancia primero; en empate, primero la fila
    expect(result.paths.red).toEqual([c(0, 0), c(1, 0), c(1, 1)]);
    expect(result.blockedAt).toBeNull();
  });

  it("nunca avanza en diagonal: cada paso cambia una sola coordenada", () => {
    const result = advanceStroke(level, { red: [c(0, 0)] }, "red", c(1, 2));
    const cells = result.paths.red as Cell[];

    for (let i = 1; i < cells.length; i++) {
      const prev = cells[i - 1] as Cell;
      const cur = cells[i] as Cell;
      expect(Math.abs(prev.row - cur.row) + Math.abs(prev.col - cur.col)).toBe(1);
    }
  });

  it("se detiene en la primera celda bloqueada e informa donde", () => {
    const paths: NodePaths = { red: [c(0, 0)] };
    const result = advanceStroke(level, paths, "red", c(0, 2));

    expect(result.paths.red).toEqual([c(0, 0), c(0, 1)]);
    expect(result.blockedAt).toEqual(c(0, 2));
  });

  it("no hace nada si la cabeza ya esta en la celda objetivo", () => {
    const paths: NodePaths = { red: [c(0, 0)] };
    const result = advanceStroke(level, paths, "red", c(0, 0));

    expect(result.paths).toBe(paths);
    expect(result.blockedAt).toBeNull();
  });
});

describe("pointToCell", () => {
  const big = parseLevel(1, ["R....", ".....", ".....", ".....", "....R"]);

  it("devuelve la celda que contiene el punto", () => {
    expect(pointToCell(big, 2.4, 3.7)).toEqual(c(3, 2));
  });

  it("ajusta al borde si el puntero sale del tablero", () => {
    expect(pointToCell(big, -3, 99)).toEqual(c(4, 0));
    expect(pointToCell(big, 99, -3)).toEqual(c(0, 4));
  });

  it("con anclaje, rozar la celda vecina no cuenta hasta entrar un poco", () => {
    const anchor = c(1, 1);

    // apenas pasado el borde derecho (columna 2 empieza en x=2)
    expect(pointToCell(big, 2.05, 1.5, anchor)).toEqual(c(1, 1));
    expect(pointToCell(big, 2.14, 1.5, anchor)).toEqual(c(1, 1));
    expect(pointToCell(big, 2.2, 1.5, anchor)).toEqual(c(1, 2));

    // igual hacia arriba y hacia la izquierda
    expect(pointToCell(big, 1.5, 0.95, anchor)).toEqual(c(1, 1));
    expect(pointToCell(big, 1.5, 0.8, anchor)).toEqual(c(0, 1));
    expect(pointToCell(big, 0.95, 1.5, anchor)).toEqual(c(1, 1));
  });

  it("con anclaje, una celda lejana se acepta sin histeresis", () => {
    expect(pointToCell(big, 3.01, 1.5, c(1, 1))).toEqual(c(1, 3));
  });
});

describe("solucion del tablero", () => {
  const solved: NodePaths = {
    red: [c(0, 0), c(1, 0), c(2, 0)],
    blue: [c(0, 2), c(1, 2), c(2, 2), c(2, 1)],
  };

  it("cuenta los pares conectados y detecta el tablero resuelto", () => {
    expect(connectedCount(level, {})).toBe(0);
    expect(connectedCount(level, { red: solved.red as Cell[] })).toBe(1);
    expect(isSolved(level, { red: solved.red as Cell[] })).toBe(false);
    expect(isSolved(level, solved)).toBe(true);
  });
});

describe("arePathsValid", () => {
  it("acepta un estado posible", () => {
    expect(arePathsValid(level, {})).toBe(true);
    expect(arePathsValid(level, { red: [c(0, 0), c(1, 0)] })).toBe(true);
    expect(
      arePathsValid(level, {
        red: [c(0, 0), c(1, 0), c(2, 0)],
        blue: [c(2, 1), c(1, 1), c(1, 2), c(0, 2)],
      }),
    ).toBe(true);
  });

  it("rechaza un trazo que no parte de uno de sus nodos", () => {
    expect(arePathsValid(level, { red: [c(1, 0), c(1, 1)] })).toBe(false);
  });

  it("rechaza celdas no contiguas o fuera del tablero", () => {
    expect(arePathsValid(level, { red: [c(0, 0), c(1, 1)] })).toBe(false);
    expect(arePathsValid(level, { red: [c(0, 0), c(-1, 0)] })).toBe(false);
  });

  it("rechaza trazos que se superponen o que se repiten a si mismos", () => {
    expect(
      arePathsValid(level, {
        red: [c(0, 0), c(0, 1), c(1, 1)],
        blue: [c(2, 1), c(1, 1)],
      }),
    ).toBe(false);
    expect(
      arePathsValid(level, { red: [c(0, 0), c(0, 1), c(0, 0)] }),
    ).toBe(false);
  });

  it("rechaza un nodo ajeno dentro del trazo y un nodo propio a mitad", () => {
    expect(arePathsValid(level, { red: [c(0, 0), c(0, 1), c(0, 2)] })).toBe(false);
    expect(
      arePathsValid(level, { red: [c(0, 0), c(1, 0), c(2, 0), c(2, 1)] }),
    ).toBe(false);
  });

  it("rechaza un color que no existe en el nivel", () => {
    expect(arePathsValid(level, { green: [c(0, 0)] })).toBe(false);
  });
});
