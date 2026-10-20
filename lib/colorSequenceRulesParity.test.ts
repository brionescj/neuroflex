import { describe, expect, it } from "vitest";

import {
  isLevelPassed,
  passThresholdPercent,
  sequenceLengthOf,
} from "../src/features/games/hooks/colorSequenceRules";
import {
  colorSequenceThresholdPercent,
  scoreColorSequenceLevel,
} from "./gameAttempts";

// Las reglas de aprobacion existen dos veces (navegador y servidor). Si se
// edita una y se olvida la otra, la base guardaria "paso" o "no paso" distinto
// de lo que vio el alumno. Este test lo detecta.
describe("reglas de seriacion: navegador y servidor coinciden", () => {
  it("mismo umbral en cada nivel", () => {
    for (let level = 1; level <= 200; level++) {
      expect(colorSequenceThresholdPercent(level)).toBe(passThresholdPercent(level));
    }
  });

  it("misma decision para cada combinacion de nivel y aciertos", () => {
    for (let level = 1; level <= 60; level++) {
      const length = sequenceLengthOf(level);

      for (let correct = 0; correct <= length; correct++) {
        expect(scoreColorSequenceLevel(level, length, correct).passed).toBe(
          isLevelPassed(level, length, correct),
        );
      }
    }
  });
});
