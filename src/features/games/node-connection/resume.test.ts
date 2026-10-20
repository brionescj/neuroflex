import { describe, expect, it } from "vitest";

import { getLevel, TOTAL_LEVELS } from "./levels";
import {
  buildNodeConnectionSnapshot,
  deserializePaths,
  isSnapshotSolved,
  parseNodeConnectionProgress,
  serializePaths,
} from "./resume";
import type { Cell, NodeLevelResult, NodePaths } from "./types";

const c = (row: number, col: number): Cell => ({ row, col });

function result(level: number): NodeLevelResult {
  return {
    level,
    pairCount: getLevel(level).pairs.length,
    timeMs: 12_000,
    undoCount: 1,
    resetCount: 0,
  };
}

// Nivel 1:  ..BR / .... / ...R / .B..
const partial: NodePaths = { red: [c(0, 3), c(1, 3)] };
const solved: NodePaths = {
  red: [c(0, 3), c(1, 3), c(2, 3)],
  blue: [c(0, 2), c(1, 2), c(2, 2), c(3, 2), c(3, 1)],
};

function playing(level: number, paths: NodePaths, results: NodeLevelResult[]) {
  return buildNodeConnectionSnapshot({
    phase: "playing",
    level,
    paths,
    elapsedMs: 34_567.4,
    undoCount: 2,
    resetCount: 1,
    results,
  });
}

describe("serializePaths", () => {
  it("ida y vuelta conserva los trazos", () => {
    expect(deserializePaths(serializePaths(solved))).toEqual(solved);
  });

  it("omite los colores sin celdas", () => {
    expect(serializePaths({ red: [] })).toEqual([]);
  });
});

describe("parseNodeConnectionProgress", () => {
  it("acepta un nivel a medias y conserva trazos, tiempo y contadores", () => {
    const snapshot = playing(1, partial, []);
    const parsed = parseNodeConnectionProgress(snapshot);

    expect(parsed).toEqual(snapshot);
    expect(parsed?.elapsedMs).toBe(34_567);
    expect(parsed?.undoCount).toBe(2);
    expect(parsed?.resetCount).toBe(1);
    expect(deserializePaths(parsed!.paths)).toEqual(partial);
  });

  it("acepta un nivel a medias sin trazos", () => {
    expect(parseNodeConnectionProgress(playing(3, {}, [result(1), result(2)]))).not.toBeNull();
  });

  it("acepta el nivel terminado y el final, sin trazos ni reloj", () => {
    const done = buildNodeConnectionSnapshot({
      phase: "level-complete",
      level: 1,
      paths: solved,
      elapsedMs: 9_999,
      undoCount: 5,
      resetCount: 5,
      results: [result(1)],
    });

    expect(done.paths).toEqual([]);
    expect(done.elapsedMs).toBe(0);
    expect(parseNodeConnectionProgress(done)).toEqual(done);

    const all = Array.from({ length: TOTAL_LEVELS }, (_, i) => result(i + 1));
    const finished = buildNodeConnectionSnapshot({
      phase: "finished",
      level: TOTAL_LEVELS,
      paths: {},
      elapsedMs: 0,
      undoCount: 0,
      resetCount: 0,
      results: all,
    });

    expect(parseNodeConnectionProgress(finished)).toEqual(finished);
  });

  it("rechaza basura, otra version o una fase desconocida", () => {
    const ok = playing(1, partial, []);

    expect(parseNodeConnectionProgress(null)).toBeNull();
    expect(parseNodeConnectionProgress("hola")).toBeNull();
    expect(parseNodeConnectionProgress({ ...ok, version: 2 })).toBeNull();
    expect(parseNodeConnectionProgress({ ...ok, phase: "otra" })).toBeNull();
  });

  it("rechaza un nivel fuera de rango", () => {
    const ok = playing(1, partial, []);

    expect(parseNodeConnectionProgress({ ...ok, level: 0 })).toBeNull();
    expect(
      parseNodeConnectionProgress({ ...ok, level: TOTAL_LEVELS + 1 }),
    ).toBeNull();
    expect(parseNodeConnectionProgress({ ...ok, level: 1.5 })).toBeNull();
  });

  it("rechaza si la cantidad de resultados no cuadra con la fase", () => {
    // jugando el nivel 3 deberia haber exactamente 2 resultados
    expect(parseNodeConnectionProgress(playing(3, {}, [result(1)]))).toBeNull();

    const done = buildNodeConnectionSnapshot({
      phase: "level-complete",
      level: 2,
      paths: {},
      elapsedMs: 0,
      undoCount: 0,
      resetCount: 0,
      results: [result(1)],
    });
    expect(parseNodeConnectionProgress(done)).toBeNull();
  });

  it("rechaza resultados fuera de orden o de otro tablero", () => {
    expect(parseNodeConnectionProgress(playing(3, {}, [result(2), result(1)]))).toBeNull();

    const wrongPairs = { ...result(1), pairCount: 7 };
    expect(parseNodeConnectionProgress(playing(2, {}, [wrongPairs]))).toBeNull();
  });

  it("rechaza trazos imposibles", () => {
    const ok = playing(1, partial, []);

    // celdas no contiguas
    expect(
      parseNodeConnectionProgress({
        ...ok,
        paths: [{ color: "red", cells: [[0, 3], [2, 3]] }],
      }),
    ).toBeNull();

    // color repetido
    expect(
      parseNodeConnectionProgress({
        ...ok,
        paths: [
          { color: "red", cells: [[0, 3]] },
          { color: "red", cells: [[2, 3]] },
        ],
      }),
    ).toBeNull();

    // color que no existe
    expect(
      parseNodeConnectionProgress({
        ...ok,
        paths: [{ color: "morado", cells: [[0, 3]] }],
      }),
    ).toBeNull();
  });

  it("rechaza trazos guardados fuera de la fase de juego", () => {
    const done = buildNodeConnectionSnapshot({
      phase: "level-complete",
      level: 1,
      paths: {},
      elapsedMs: 0,
      undoCount: 0,
      resetCount: 0,
      results: [result(1)],
    });

    expect(
      parseNodeConnectionProgress({
        ...done,
        paths: [{ color: "red", cells: [[0, 3]] }],
      }),
    ).toBeNull();
  });

  it("rechaza contadores y tiempos absurdos", () => {
    const ok = playing(1, partial, []);

    expect(parseNodeConnectionProgress({ ...ok, undoCount: -1 })).toBeNull();
    expect(parseNodeConnectionProgress({ ...ok, resetCount: 1.5 })).toBeNull();
    expect(parseNodeConnectionProgress({ ...ok, elapsedMs: -1 })).toBeNull();
    expect(parseNodeConnectionProgress({ ...ok, elapsedMs: 1e12 })).toBeNull();
    expect(parseNodeConnectionProgress({ ...ok, elapsedMs: Number.NaN })).toBeNull();
  });
});

describe("isSnapshotSolved", () => {
  it("distingue un tablero resuelto de uno a medias", () => {
    expect(isSnapshotSolved(playing(1, solved, []))).toBe(true);
    expect(isSnapshotSolved(playing(1, partial, []))).toBe(false);
  });
});
