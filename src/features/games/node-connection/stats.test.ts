import { describe, expect, it } from "vitest";

import { getLevel } from "./levels";
import {
  cellsErased,
  cleanStats,
  corrections,
  emptyStats,
  removedCells,
} from "./stats";
import type { Cell, NodePaths } from "./types";

const c = (row: number, col: number): Cell => ({ row, col });

// Nivel 1:  ..BR / .... / ...R / .B..  (nodos en (0,2),(3,1) azul y (0,3),(2,3) rojo)
const level = getLevel(1);

describe("removedCells", () => {
  it("cuenta solo celdas dibujadas que desaparecen", () => {
    const before: NodePaths = { red: [c(0, 3), c(1, 3), c(2, 3)] };
    const after: NodePaths = { red: [c(0, 3)] };

    // (1,3) es dibujada; (2,3) es nodo y no cuenta.
    expect(removedCells(level, before, after)).toBe(1);
  });

  it("no cuenta los nodos aunque desaparezca todo el trazo", () => {
    const before: NodePaths = { red: [c(0, 3), c(1, 3)] };

    expect(removedCells(level, before, {})).toBe(1);
  });

  it("sin cambios o solo con celdas nuevas no hay borradas", () => {
    const before: NodePaths = { red: [c(0, 3), c(1, 3)] };
    const after: NodePaths = { red: [c(0, 3), c(1, 3), c(2, 3)] };

    expect(removedCells(level, before, before)).toBe(0);
    expect(removedCells(level, before, after)).toBe(0);
  });

  it("una celda movida a otro color cuenta como borrada del original", () => {
    const before: NodePaths = { blue: [c(0, 2), c(1, 2), c(1, 1)] };
    const after: NodePaths = { blue: [c(0, 2), c(1, 2)] };

    expect(removedCells(level, before, after)).toBe(1);
  });
});

describe("cleanStats", () => {
  it("acepta contadores validos", () => {
    const stats = { ...emptyStats(), strokesStarted: 4, resetCells: 7 };

    expect(cleanStats(stats)).toEqual(stats);
  });

  it("rechaza faltantes, negativos, decimales y no numericos", () => {
    expect(cleanStats(null)).toBeUndefined();
    expect(cleanStats({})).toBeUndefined();
    expect(cleanStats({ ...emptyStats(), strokesStarted: -1 })).toBeUndefined();
    expect(cleanStats({ ...emptyStats(), blockedCount: 1.5 })).toBeUndefined();
    expect(cleanStats({ ...emptyStats(), resetCells: "3" })).toBeUndefined();
  });

  it("ignora campos de mas", () => {
    expect(cleanStats({ ...emptyStats(), extra: 9 })).toEqual(emptyStats());
  });
});

describe("cellsErased y corrections", () => {
  it("suma retroceder, rehacer ruta y rehacer tablero", () => {
    const stats = { ...emptyStats(), backtrackCells: 2, restartCells: 3, resetCells: 5 };

    expect(cellsErased(stats)).toBe(10);
  });

  it("las correcciones incluyen retrocesos y rutas rehechas", () => {
    const stats = { ...emptyStats(), routeRestarts: 2, backtrackGestures: 3 };

    expect(corrections({ undoCount: 1, resetCount: 1, stats })).toBe(7);
  });

  it("sin contadores (partida antigua) solo deshacer y rehacer tablero", () => {
    expect(corrections({ undoCount: 2, resetCount: 1 })).toBe(3);
  });
});
