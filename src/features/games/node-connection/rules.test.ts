import { describe, expect, it } from "vitest";

import { LEVELS, TOTAL_LEVELS } from "./levels";
import {
  MAX_TRIES_PER_LEVEL,
  allowedErrors,
  errorsOf,
  errorsPerPair,
  isOverLimit,
  isTryPassed,
  nextStepAfter,
  nodeResultKey,
  replayFlow,
} from "./rules";

describe("errores permitidos", () => {
  it("bajan por tramos: 3 por par (1 a 5), 2 (6 a 10) y 1 (11 a 15)", () => {
    expect([1, 5].map(errorsPerPair)).toEqual([3, 3]);
    expect([6, 10].map(errorsPerPair)).toEqual([2, 2]);
    expect([11, 15].map(errorsPerPair)).toEqual([1, 1]);
  });

  it("crecen con los pares del tablero", () => {
    expect(allowedErrors(1, 2)).toBe(6);
    expect(allowedErrors(8, 6)).toBe(12);
    expect(allowedErrors(15, 8)).toBe(8);
  });

  it("nunca se permiten menos errores en un nivel mas dificil que el margen por par de su tramo", () => {
    for (const level of LEVELS) {
      expect(allowedErrors(level.id, level.pairs.length)).toBeGreaterThanOrEqual(level.pairs.length);
    }
  });
});

describe("errores cometidos", () => {
  it("un choque vale uno y rehacer el tablero vale dos", () => {
    expect(errorsOf({ blockedCount: 3, resetCount: 0 })).toBe(3);
    expect(errorsOf({ blockedCount: 0, resetCount: 2 })).toBe(4);
    expect(errorsOf({ blockedCount: 3, resetCount: 2 })).toBe(7);
  });

  it("se puede llegar justo al limite sin perder; el siguiente error lo pierde", () => {
    // Nivel 1, 2 pares: 6 permitidos.
    expect(isOverLimit(1, 2, { blockedCount: 6, resetCount: 0 })).toBe(false);
    expect(isOverLimit(1, 2, { blockedCount: 7, resetCount: 0 })).toBe(true);
    expect(isOverLimit(1, 2, { blockedCount: 4, resetCount: 1 })).toBe(false);
    expect(isOverLimit(1, 2, { blockedCount: 5, resetCount: 1 })).toBe(true);
  });
});

describe("pasar un intento", () => {
  const base = { level: 1, pairCount: 2, blockedCount: 6, resetCount: 0 };

  it("exige el tablero resuelto y los errores dentro del margen", () => {
    expect(isTryPassed({ ...base, solved: true })).toBe(true);
    expect(isTryPassed({ ...base, solved: false })).toBe(false);
    expect(isTryPassed({ ...base, solved: true, blockedCount: 7 })).toBe(false);
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
