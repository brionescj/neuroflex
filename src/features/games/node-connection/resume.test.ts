import { describe, expect, it } from "vitest";

import { getLevel, TOTAL_LEVELS } from "./levels";
import {
  buildNodeConnectionSnapshot,
  deserializePaths,
  isSnapshotSolved,
  parseNodeConnectionProgress,
  serializePaths,
} from "./resume";
import type { Cell, NodeEvent, NodeLevelResult, NodePaths } from "./types";

const c = (row: number, col: number): Cell => ({ row, col });

function result(level: number): NodeLevelResult {
  return {
    level,
    tryNumber: 1,
    solved: true,
    passed: true,
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

describe("bitacora de eventos en el avance guardado", () => {
  const events: NodeEvent[] = [
    { t: 800, type: "start", color: "red", row: 0, col: 3 },
    { t: 1900, type: "end", color: "red", len: 2, done: false, back: 0 },
    { t: 2500, type: "undo" },
  ];

  it("la del nivel en curso se conserva al reanudar, con lo que se dejo fuera", () => {
    const snapshot = buildNodeConnectionSnapshot({
      phase: "playing",
      level: 1,
      paths: partial,
      elapsedMs: 3000,
      undoCount: 1,
      resetCount: 0,
      events,
      eventsDropped: 4,
      results: [],
    });
    const parsed = parseNodeConnectionProgress(snapshot);

    expect(parsed?.events).toEqual(events);
    expect(parsed?.eventsDropped).toBe(4);
  });

  it("fuera de un nivel en curso no se guarda", () => {
    const snapshot = buildNodeConnectionSnapshot({
      phase: "level-complete",
      level: 1,
      paths: {},
      elapsedMs: 0,
      undoCount: 0,
      resetCount: 0,
      events,
      results: [result(1)],
    });

    expect(snapshot).not.toHaveProperty("events");
  });

  it("los niveles terminados no repiten su bitacora en cada guardado", () => {
    const withEvents: NodeLevelResult = { ...result(1), events, eventsDropped: 2 };
    const snapshot = buildNodeConnectionSnapshot({
      phase: "playing",
      level: 2,
      paths: {},
      elapsedMs: 1000,
      undoCount: 0,
      resetCount: 0,
      results: [withEvents],
    });

    expect(snapshot.results[0]).not.toHaveProperty("events");
    expect(snapshot.results[0]).not.toHaveProperty("eventsDropped");
    expect(snapshot.results[0]?.level).toBe(1);
  });

  it("un evento malo se descarta y el avance sigue siendo valido", () => {
    const snapshot = {
      ...buildNodeConnectionSnapshot({
        phase: "playing",
        level: 1,
        paths: partial,
        elapsedMs: 3000,
        undoCount: 0,
        resetCount: 0,
        results: [],
      }),
      events: [...events, { t: 5, type: "teleport" }, null],
    };

    expect(parseNodeConnectionProgress(snapshot)?.events).toEqual(events);
  });

  it("un avance anterior, sin bitacora, sigue siendo valido", () => {
    const snapshot = playing(1, partial, []);

    expect(snapshot).not.toHaveProperty("events");
    expect(parseNodeConnectionProgress(snapshot)).toEqual(snapshot);
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

describe("registro de partida en el avance", () => {
  const attempt = { attemptId: "abcdefgh12345678", startedAt: "2026-10-14T11:00:00.000Z" };

  it("conserva el tiempo neto y la partida", () => {
    const snap = buildNodeConnectionSnapshot({
      phase: "playing",
      level: 1,
      paths: partial,
      elapsedMs: 30_000,
      netMs: 21_000.4,
      undoCount: 0,
      resetCount: 0,
      results: [],
      attempt,
    });

    const parsed = parseNodeConnectionProgress(snap);

    expect(parsed?.netMs).toBe(21_000);
    expect(parsed?.attempt).toEqual(attempt);
  });

  it("ignora un neto mayor que el bruto", () => {
    const snap = { ...playing(1, partial, []), netMs: 999_999 };

    expect(parseNodeConnectionProgress(snap)?.netMs).toBeUndefined();
  });

  it("un avance anterior al registro sigue siendo valido", () => {
    const parsed = parseNodeConnectionProgress(playing(1, partial, []));

    expect(parsed).not.toBeNull();
    expect(parsed?.attempt).toBeUndefined();
    expect(parsed?.netMs).toBeUndefined();
  });

  it("descarta campos opcionales mal formados de un resultado", () => {
    const snap = playing(2, {}, [
      { ...result(1), activeMsNet: -5, completedAt: "no es fecha" },
    ]);

    expect(parseNodeConnectionProgress(snap)?.results[0]).toEqual(result(1));
  });

  it("conserva los campos opcionales bien formados de un resultado", () => {
    const full = {
      ...result(1),
      activeMsNet: 9_000,
      completedAt: "2026-10-14T11:10:00.000Z",
    };

    expect(
      parseNodeConnectionProgress(playing(2, {}, [full]))?.results[0],
    ).toEqual(full);
  });

  it("conserva los contadores del nivel en curso y los de cada resultado", () => {
    const stats = {
      strokesStarted: 3, backtrackCells: 1, backtrackGestures: 1,
      routeRestarts: 0, restartCells: 0, resetCells: 2, blockedCount: 4,
    };
    const snap = buildNodeConnectionSnapshot({
      phase: "playing",
      level: 2,
      paths: {},
      elapsedMs: 5000,
      undoCount: 0,
      resetCount: 0,
      stats,
      results: [{ ...result(1), stats }],
    });
    const parsed = parseNodeConnectionProgress(snap);

    expect(parsed?.stats).toEqual(stats);
    expect(parsed?.results[0]?.stats).toEqual(stats);
  });

  it("descarta contadores mal formados sin invalidar el avance", () => {
    const snap = {
      ...playing(2, {}, [result(1)]),
      stats: { strokesStarted: -3 },
    };
    const parsed = parseNodeConnectionProgress(snap);

    expect(parsed).not.toBeNull();
    expect(parsed?.stats).toBeUndefined();
  });

  it("una partida con identificador malo se trata como sin partida", () => {
    const snap = { ...playing(1, partial, []), attempt: { attemptId: "x" } };

    expect(parseNodeConnectionProgress(snap)?.attempt).toBeUndefined();
  });
});

describe("reintentos y partida perdida en el avance guardado", () => {
  const lost = (level: number, tryNumber: number): NodeLevelResult => ({
    ...result(level),
    tryNumber,
    solved: false,
    passed: false,
  });

  const snap = (
    phase: "playing" | "level-complete" | "level-failed" | "finished" | "failed",
    level: number,
    tryNumber: number,
    results: NodeLevelResult[],
  ) =>
    buildNodeConnectionSnapshot({
      phase,
      level,
      tryNumber,
      paths: {},
      elapsedMs: 0,
      undoCount: 0,
      resetCount: 0,
      results,
    });

  it("un intento perdido espera el reintento y el siguiente es del mismo nivel", () => {
    const failed = snap("level-failed", 2, 1, [result(1), lost(2, 1)]);

    expect(parseNodeConnectionProgress(failed)).toEqual(failed);

    const retrying = playing(2, {}, [result(1), lost(2, 1)]);

    // sigue el intento 2 del nivel 2, no el nivel 3
    expect(parseNodeConnectionProgress({ ...retrying, tryNumber: 2 })).not.toBeNull();
    expect(parseNodeConnectionProgress({ ...retrying, tryNumber: 1 })).toBeNull();
    expect(parseNodeConnectionProgress({ ...retrying, level: 3, tryNumber: 1 })).toBeNull();
  });

  it("level-failed exige que el ultimo intento sea perdido y que queden intentos", () => {
    expect(parseNodeConnectionProgress(snap("level-failed", 1, 1, [result(1)]))).toBeNull();
    expect(
      parseNodeConnectionProgress(
        snap("level-failed", 1, 3, [lost(1, 1), lost(1, 2), lost(1, 3)]),
      ),
    ).toBeNull();
  });

  it("failed: tres intentos perdidos en un nivel obligatorio", () => {
    const results = [result(1), lost(2, 1), lost(2, 2), lost(2, 3)];
    const failed = snap("failed", 2, 3, results);

    expect(parseNodeConnectionProgress(failed)).toEqual(failed);
    expect(parseNodeConnectionProgress(snap("failed", 2, 2, results.slice(0, 3)))).toBeNull();
  });

  it("finished: tambien al agotar los intentos desde el nivel 11", () => {
    const passed = Array.from({ length: 10 }, (_, i) => result(i + 1));
    const results = [...passed, lost(11, 1), lost(11, 2), lost(11, 3)];
    const closed = snap("finished", 11, 3, results);

    expect(parseNodeConnectionProgress(closed)).toEqual(closed);
    // en el nivel 10 agotar los intentos es una partida perdida, no terminada
    const tenLost = [...passed.slice(0, 9), lost(10, 1), lost(10, 2), lost(10, 3)];

    expect(parseNodeConnectionProgress(snap("finished", 10, 3, tenLost))).toBeNull();
    expect(parseNodeConnectionProgress(snap("failed", 10, 3, tenLost))).not.toBeNull();
  });

  it("rechaza un intento pasado cuyo tablero no se resolvio", () => {
    const bad = { ...result(1), solved: false, passed: true };

    expect(parseNodeConnectionProgress(snap("level-complete", 1, 1, [bad]))).toBeNull();
  });

  it("un avance anterior a los reintentos se lee como primeros intentos pasados", () => {
    const old = {
      version: 1,
      phase: "level-complete",
      level: 2,
      paths: [],
      elapsedMs: 0,
      undoCount: 0,
      resetCount: 0,
      results: [
        { level: 1, pairCount: 2, timeMs: 5000, undoCount: 0, resetCount: 0 },
        { level: 2, pairCount: 3, timeMs: 7000, undoCount: 0, resetCount: 0 },
      ],
    };
    const parsed = parseNodeConnectionProgress(old);

    expect(parsed?.tryNumber).toBe(1);
    expect(parsed?.results.map((r) => [r.tryNumber, r.solved, r.passed])).toEqual([
      [1, true, true],
      [1, true, true],
    ]);
  });
});
