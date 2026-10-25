import { describe, expect, it } from "vitest";

import { LEVELS, TOTAL_LEVELS } from "./levels";
import {
  type ErrorCounts,
  errorCountsOf,
  MAX_TRIES_PER_LEVEL,
  allowedErrors,
  errorsOf,
  allowedPercentOfPairs,
  MIN_ALLOWED_ERRORS,
  isOverLimit,
  isTryPassed,
  nextStepAfter,
  nodeResultKey,
  replayFlow,
} from "./rules";

const counts = (extra: Partial<ErrorCounts> = {}): ErrorCounts => ({
  blockedCount: 0,
  resetCount: 0,
  undoCount: 0,
  routeRestarts: 0,
  backtrackGestures: 0,
  ...extra,
});

describe("errores permitidos", () => {
  it("el margen se achica por tramos: 100 % de los pares (1 a 5), 80 % (6 a 10) y 60 % (11 a 15)", () => {
    expect([1, 5].map(allowedPercentOfPairs)).toEqual([100, 100]);
    expect([6, 10].map(allowedPercentOfPairs)).toEqual([80, 80]);
    expect([11, 15].map(allowedPercentOfPairs)).toEqual([60, 60]);
  });

  it("crecen con los pares del tablero, redondeando hacia arriba", () => {
    expect(allowedErrors(5, 5)).toBe(5);
    expect(allowedErrors(9, 7)).toBe(6); // 80 % de 7 = 5,6 -> 6
    expect(allowedErrors(13, 8)).toBe(5); // 60 % de 8 = 4,8 -> 5
  });

  it("nunca bajan del minimo, ni en el tablero mas chico", () => {
    expect(MIN_ALLOWED_ERRORS).toBe(4);
    expect(allowedErrors(1, 2)).toBe(4);
    expect(allowedErrors(11, 2)).toBe(4);
  });

  it("la tabla por nivel: 4,4,4,4,5 | 4,5,5,6,6 | 5,5,5,5,5", () => {
    expect(LEVELS.map((level) => allowedErrors(level.id, level.pairs.length))).toEqual([
      4, 4, 4, 4, 5, 4, 5, 5, 6, 6, 5, 5, 5, 5, 5,
    ]);
  });

  it("el margen por par nunca sube al avanzar de tramo", () => {
    for (let level = 2; level <= 15; level++) {
      expect(allowedPercentOfPairs(level)).toBeLessThanOrEqual(allowedPercentOfPairs(level - 1));
    }
  });
});

describe("errores cometidos", () => {
  it("un choque vale uno y rehacer el tablero vale dos", () => {
    expect(errorsOf(counts({ blockedCount: 3 }))).toBe(3);
    expect(errorsOf(counts({ resetCount: 2 }))).toBe(4);
    expect(errorsOf(counts({ blockedCount: 3, resetCount: 2 }))).toBe(7);
  });

  it("deshacer, rehacer una ruta tocandola y retroceder valen uno cada uno", () => {
    expect(errorsOf(counts({ undoCount: 2 }))).toBe(2);
    expect(errorsOf(counts({ routeRestarts: 3 }))).toBe(3);
    expect(errorsOf(counts({ backtrackGestures: 1 }))).toBe(1);
    expect(errorsOf({ blockedCount: 1, resetCount: 1, undoCount: 1, routeRestarts: 1, backtrackGestures: 1 })).toBe(6);
  });

  it("errorCountsOf lee los contadores guardados; sin ellos (avance antiguo) cuentan cero", () => {
    expect(
      errorCountsOf({
        undoCount: 2,
        resetCount: 1,
        stats: { blockedCount: 3, routeRestarts: 1, backtrackGestures: 4 },
      }),
    ).toEqual({ blockedCount: 3, resetCount: 1, undoCount: 2, routeRestarts: 1, backtrackGestures: 4 });
    expect(errorCountsOf({ undoCount: 1, resetCount: 0 })).toEqual(counts({ undoCount: 1 }));
  });

  it("se puede llegar justo al limite sin perder; el siguiente error lo pierde", () => {
    // Nivel 1, 2 pares: 4 permitidos (el minimo).
    expect(isOverLimit(1, 2, counts({ blockedCount: 4 }))).toBe(false);
    expect(isOverLimit(1, 2, counts({ blockedCount: 5 }))).toBe(true);
    expect(isOverLimit(1, 2, counts({ blockedCount: 2, resetCount: 1 }))).toBe(false);
    expect(isOverLimit(1, 2, counts({ blockedCount: 3, resetCount: 1 }))).toBe(true);
    expect(isOverLimit(1, 2, counts({ undoCount: 2, backtrackGestures: 1, routeRestarts: 1 }))).toBe(false);
    expect(isOverLimit(1, 2, counts({ undoCount: 3, backtrackGestures: 1, routeRestarts: 1 }))).toBe(true);
  });
});

describe("pasar un intento", () => {
  const base = { level: 1, pairCount: 2, ...counts({ blockedCount: 4 }) };

  it("exige el tablero resuelto y los errores dentro del margen", () => {
    expect(isTryPassed({ ...base, solved: true })).toBe(true);
    expect(isTryPassed({ ...base, solved: false })).toBe(false);
    expect(isTryPassed({ ...base, solved: true, blockedCount: 5 })).toBe(false);
  });
});

describe("que pasa despues de un intento", () => {
  it("pasarlo avanza; el ultimo tablero completa la partida", () => {
    expect(nextStepAfter({ level: 3, tryNumber: 1, passed: true })).toBe("next-level");
    expect(nextStepAfter({ level: 3, tryNumber: 3, passed: true })).toBe("next-level");
    expect(nextStepAfter({ level: TOTAL_LEVELS, tryNumber: 2, passed: true })).toBe("complete");
  });

  it("perderlo con intentos disponibles reintenta el mismo nivel", () => {
    expect(nextStepAfter({ level: 3, tryNumber: 1, passed: false })).toBe("retry");
    expect(nextStepAfter({ level: 12, tryNumber: MAX_TRIES_PER_LEVEL - 1, passed: false })).toBe("retry");
  });

  it("sin intentos: del 1 al 10 se reinicia, desde el 11 se cierra", () => {
    expect(nextStepAfter({ level: 1, tryNumber: 3, passed: false })).toBe("restart");
    expect(nextStepAfter({ level: 10, tryNumber: 3, passed: false })).toBe("restart");
    expect(nextStepAfter({ level: 11, tryNumber: 3, passed: false })).toBe("close");
    expect(nextStepAfter({ level: 15, tryNumber: 3, passed: false })).toBe("close");
  });
});

describe("replayFlow", () => {
  const ok = (level: number, tryNumber = 1) => ({ level, tryNumber, passed: true });
  const lost = (level: number, tryNumber = 1) => ({ level, tryNumber, passed: false });

  it("una partida vacia empieza en el nivel 1, intento 1", () => {
    expect(replayFlow([])).toEqual({
      ok: true,
      level: 1,
      tryNumber: 1,
      terminal: null,
      maxLevelPassed: 0,
    });
  });

  it("sigue reintentos y avances", () => {
    expect(replayFlow([ok(1), lost(2), lost(2, 2), ok(2, 3)])).toEqual({
      ok: true,
      level: 3,
      tryNumber: 1,
      terminal: null,
      maxLevelPassed: 2,
    });
  });

  it("detecta el fin por intentos agotados", () => {
    expect(replayFlow([lost(1), lost(1, 2), lost(1, 3)])).toMatchObject({ ok: true, terminal: "restart" });

    const eleven = Array.from({ length: 10 }, (_, i) => ok(i + 1));

    expect(replayFlow([...eleven, lost(11), lost(11, 2), lost(11, 3)])).toMatchObject({
      terminal: "close",
      maxLevelPassed: 10,
    });
  });

  it("completar los 15 niveles es terminal", () => {
    const all = Array.from({ length: TOTAL_LEVELS }, (_, i) => ok(i + 1));

    expect(replayFlow(all)).toMatchObject({ ok: true, terminal: "complete", maxLevelPassed: TOTAL_LEVELS });
  });

  it("rechaza lo imposible: saltar un nivel, repetir un intento o seguir tras el fin", () => {
    expect(replayFlow([ok(2)])).toEqual({ ok: false });
    expect(replayFlow([ok(1), ok(1)])).toEqual({ ok: false });
    expect(replayFlow([lost(1, 2)])).toEqual({ ok: false });
    expect(replayFlow([lost(1), lost(1, 2), lost(1, 3), ok(1)])).toEqual({ ok: false });
  });
});

describe("clave del resultado", () => {
  it("el primer intento conserva la clave de siempre", () => {
    expect(nodeResultKey(3, 1)).toBe("3");
    expect(nodeResultKey(3, 2)).toBe("3.2");
  });
});
