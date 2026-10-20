import { describe, expect, it } from "vitest";

import {
  MAX_TRIES_PER_LEVEL,
  isLevelPassed,
  nextStepAfter,
  passThresholdPercent,
  replayFlow,
  requiredCorrect,
  sequenceLengthOf,
} from "./colorSequenceRules";

describe("passThresholdPercent", () => {
  it("60% en los niveles 1 a 5, 70% en 6 a 8, 90% en 9 y 10, 75% desde el 11", () => {
    expect([1, 2, 3, 4, 5].map(passThresholdPercent)).toEqual([60, 60, 60, 60, 60]);
    expect([6, 7, 8].map(passThresholdPercent)).toEqual([70, 70, 70]);
    expect([9, 10].map(passThresholdPercent)).toEqual([90, 90]);
    expect([11, 12, 20, 100].map(passThresholdPercent)).toEqual([75, 75, 75, 75]);
  });
});

describe("requiredCorrect / isLevelPassed", () => {
  it("aciertos minimos por nivel (largo = nivel + 1)", () => {
    const required = Array.from({ length: 12 }, (_, i) =>
      requiredCorrect(i + 1, sequenceLengthOf(i + 1)),
    );

    //            n1 n2 n3 n4 n5 n6 n7 n8 n9 n10 n11 n12
    expect(required).toEqual([2, 2, 3, 3, 4, 5, 6, 7, 9, 10, 9, 10]);
  });

  it("no exige un acierto de mas cuando el porcentaje da justo (5 colores al 60%)", () => {
    expect(requiredCorrect(4, 5)).toBe(3);
    expect(isLevelPassed(4, 5, 3)).toBe(true);
    expect(isLevelPassed(4, 5, 2)).toBe(false);
  });

  it("pasa justo en el umbral y no pasa un acierto antes", () => {
    for (let level = 1; level <= 60; level++) {
      const length = sequenceLengthOf(level);
      const needed = requiredCorrect(level, length);

      expect(isLevelPassed(level, length, needed)).toBe(true);
      expect(isLevelPassed(level, length, needed - 1)).toBe(false);
      expect(isLevelPassed(level, length, length)).toBe(true);
    }
  });

  it("coincide con el porcentaje redondeado hacia arriba", () => {
    // nivel 10: 11 colores, 9 aciertos = 81,8% < 90% ; 10 = 90,9% >= 90%
    expect(isLevelPassed(10, 11, 9)).toBe(false);
    expect(isLevelPassed(10, 11, 10)).toBe(true);
    // nivel 11: 12 colores, 9 aciertos = 75% exacto
    expect(isLevelPassed(11, 12, 9)).toBe(true);
    expect(isLevelPassed(11, 12, 8)).toBe(false);
  });
});

describe("nextStepAfter", () => {
  it("pasar el nivel avanza", () => {
    expect(nextStepAfter({ level: 3, tryNumber: 1, passed: true })).toBe("next-level");
    expect(nextStepAfter({ level: 3, tryNumber: 3, passed: true })).toBe("next-level");
  });

  it("fallar con intentos disponibles reintenta", () => {
    expect(nextStepAfter({ level: 3, tryNumber: 1, passed: false })).toBe("retry");
    expect(nextStepAfter({ level: 15, tryNumber: MAX_TRIES_PER_LEVEL - 1, passed: false })).toBe("retry");
  });

  it("agotar los intentos hasta el nivel 10 reinicia la partida", () => {
    expect(nextStepAfter({ level: 1, tryNumber: 3, passed: false })).toBe("restart");
    expect(nextStepAfter({ level: 10, tryNumber: 3, passed: false })).toBe("restart");
  });

  it("agotar los intentos desde el nivel 11 cierra la partida", () => {
    expect(nextStepAfter({ level: 11, tryNumber: 3, passed: false })).toBe("close");
    expect(nextStepAfter({ level: 30, tryNumber: 3, passed: false })).toBe("close");
  });
});

describe("replayFlow", () => {
  const t = (level: number, tryNumber: number, passed: boolean) => ({
    level,
    tryNumber,
    passed,
  });

  it("sin resultados toca el nivel 1, intento 1", () => {
    expect(replayFlow([])).toEqual({
      ok: true,
      level: 1,
      tryNumber: 1,
      terminal: null,
      maxLevelPassed: 0,
    });
  });

  it("avanza de nivel al pasar y de intento al fallar", () => {
    expect(replayFlow([t(1, 1, true), t(2, 1, false), t(2, 2, false)])).toEqual({
      ok: true,
      level: 2,
      tryNumber: 3,
      terminal: null,
      maxLevelPassed: 1,
    });
  });

  it("agotar intentos en un nivel obligatorio deja la partida terminal (reinicio)", () => {
    const flow = replayFlow([t(1, 1, true), t(2, 1, false), t(2, 2, false), t(2, 3, false)]);

    expect(flow).toMatchObject({ ok: true, terminal: "restart", maxLevelPassed: 1 });
  });

  it("agotar intentos desde el nivel 11 deja la partida terminal (cierre)", () => {
    const passed = Array.from({ length: 10 }, (_, i) => t(i + 1, 1, true));
    const flow = replayFlow([...passed, t(11, 1, false), t(11, 2, false), t(11, 3, false)]);

    expect(flow).toMatchObject({ ok: true, terminal: "close", maxLevelPassed: 10 });
  });

  it("rechaza resultados que no pudieron ocurrir", () => {
    // salta un nivel
    expect(replayFlow([t(2, 1, true)]).ok).toBe(false);
    // repite el intento 1 despues de fallar
    expect(replayFlow([t(1, 1, false), t(1, 1, false)]).ok).toBe(false);
    // juega otro intento tras pasar el nivel
    expect(replayFlow([t(1, 1, true), t(1, 2, true)]).ok).toBe(false);
    // sigue jugando tras agotar los intentos
    expect(
      replayFlow([t(1, 1, false), t(1, 2, false), t(1, 3, false), t(1, 1, true)]).ok,
    ).toBe(false);
    // un cuarto intento
    expect(
      replayFlow([t(1, 1, false), t(1, 2, false), t(1, 3, false), t(1, 4, false)]).ok,
    ).toBe(false);
  });
});
