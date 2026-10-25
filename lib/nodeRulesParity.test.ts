import { describe, expect, it } from "vitest";

import {
  MAX_TRIES_PER_LEVEL,
  MIN_LEVELS,
  RESET_ERROR_WEIGHT,
  allowedErrors,
  errorsOf,
  isTryPassed,
} from "../src/features/games/node-connection/rules";
import {
  NODE_MAX_TRIES,
  NODE_MIN_LEVELS,
  NODE_RESET_ERROR_WEIGHT,
  isNodeResultPassed,
  nodeAllowedErrors,
  nodeErrorsOf,
  scoreNodeTry,
} from "./nodeRules";

// Las reglas de aprobacion de nodos existen dos veces (navegador y servidor). Si
// se edita una y se olvida la otra, la base guardaria "paso" o "no paso" distinto
// de lo que vio el alumno. Este test lo detecta.
describe("reglas de nodos: navegador y servidor coinciden", () => {
  it("mismas constantes", () => {
    expect(NODE_MAX_TRIES).toBe(MAX_TRIES_PER_LEVEL);
    expect(NODE_MIN_LEVELS).toBe(MIN_LEVELS);
    expect(NODE_RESET_ERROR_WEIGHT).toBe(RESET_ERROR_WEIGHT);
  });

  it("mismos errores permitidos y cometidos", () => {
    for (let level = 1; level <= 15; level++) {
      for (let pairs = 1; pairs <= 8; pairs++) {
        expect(nodeAllowedErrors(level, pairs)).toBe(allowedErrors(level, pairs));
      }
    }

    for (let blocked = 0; blocked <= 12; blocked++) {
      for (let reset = 0; reset <= 6; reset++) {
        expect(nodeErrorsOf({ blockedCount: blocked, resetCount: reset })).toBe(
          errorsOf({ blockedCount: blocked, resetCount: reset }),
        );
      }
    }
  });

  it("misma decision para cada combinacion de nivel, errores y tablero resuelto", () => {
    for (let level = 1; level <= 15; level++) {
      for (const pairCount of [2, 5, 8]) {
        for (let blockedCount = 0; blockedCount <= 30; blockedCount++) {
          for (const resetCount of [0, 1, 3]) {
            for (const solved of [true, false]) {
              const server = scoreNodeTry(level, { pairCount, blockedCount, resetCount, solved });

              expect(server?.passed).toBe(
                isTryPassed({ level, pairCount, solved, blockedCount, resetCount }),
              );
            }
          }
        }
      }
    }
  });
});

describe("scoreNodeTry", () => {
  it("ignora lo que el navegador diga sobre errores y aprobacion", () => {
    const score = scoreNodeTry(1, {
      pairCount: 2,
      blockedCount: 9,
      resetCount: 0,
      solved: true,
      passed: true,
      errors: 0,
      errorsAllowed: 99,
    });

    expect(score).toEqual({ errors: 9, errorsAllowed: 3, passed: false });
  });

  it("sin contadores (resultado antiguo) no puntua", () => {
    expect(scoreNodeTry(1, { pairCount: 2, resetCount: 0 })).toBeNull();
  });

  it("un resultado sin `solved` se toma como tablero completado", () => {
    expect(scoreNodeTry(1, { pairCount: 2, blockedCount: 1, resetCount: 0 })?.passed).toBe(true);
  });
});

describe("isNodeResultPassed", () => {
  it("usa lo guardado; un resultado antiguo (solo existia al completar) cuenta como pasado", () => {
    expect(isNodeResultPassed({ index: 3, metrics: { passed: false } })).toBe(false);
    expect(isNodeResultPassed({ index: 3, metrics: { passed: true } })).toBe(true);
    expect(isNodeResultPassed({ index: 3, metrics: { pairCount: 3 } })).toBe(true);
  });
});
