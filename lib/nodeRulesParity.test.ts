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

    for (let blocked = 0; blocked <= 6; blocked++) {
      for (let reset = 0; reset <= 3; reset++) {
        for (let undo = 0; undo <= 3; undo++) {
          for (let restarts = 0; restarts <= 3; restarts++) {
            for (let back = 0; back <= 3; back++) {
              const counts = {
                blockedCount: blocked,
                resetCount: reset,
                undoCount: undo,
                routeRestarts: restarts,
                backtrackGestures: back,
              };

              expect(nodeErrorsOf(counts)).toBe(errorsOf(counts));
            }
          }
        }
      }
    }
  });

  it("misma decision para cada combinacion de nivel, errores y tablero resuelto", () => {
    for (let level = 1; level <= 15; level++) {
      for (const pairCount of [2, 5, 8]) {
        for (let blockedCount = 0; blockedCount <= 30; blockedCount++) {
          for (const resetCount of [0, 1, 3]) {
            for (const [undoCount, routeRestarts, backtrackGestures] of [[0, 0, 0], [2, 1, 3]] as const) {
              for (const solved of [true, false]) {
                const server = scoreNodeTry(level, {
                  pairCount,
                  blockedCount,
                  resetCount,
                  undoCount,
                  routeRestarts,
                  backtrackGestures,
                  solved,
                });

                expect(server?.passed).toBe(
                  isTryPassed({
                    level,
                    pairCount,
                    solved,
                    blockedCount,
                    resetCount,
                    undoCount,
                    routeRestarts,
                    backtrackGestures,
                  }),
                );
              }
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

    expect(score).toEqual({ errors: 9, errorsAllowed: 4, passed: false });
  });

  it("deshacer, rehacer una ruta y retroceder suman errores en el servidor", () => {
    const score = scoreNodeTry(1, {
      pairCount: 2,
      blockedCount: 1,
      resetCount: 0,
      undoCount: 2,
      routeRestarts: 1,
      backtrackGestures: 1,
      solved: true,
    });

    expect(score).toEqual({ errors: 5, errorsAllowed: 4, passed: false });
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
