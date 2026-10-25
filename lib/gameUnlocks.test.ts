import { describe, expect, it } from "vitest";

import { MINI_CASES_UNLOCK_LEVEL, meetsMiniCasesRule } from "./gameUnlocks";

describe("meetsMiniCasesRule", () => {
  it("exige el nivel 10 en los dos juegos", () => {
    expect(MINI_CASES_UNLOCK_LEVEL).toBe(10);
    expect(meetsMiniCasesRule({ colorSequenceMaxLevelPassed: 10, nodeMaxLevelPassed: 10 })).toBe(true);
    expect(meetsMiniCasesRule({ colorSequenceMaxLevelPassed: 14, nodeMaxLevelPassed: 15 })).toBe(true);
  });

  it("con uno solo de los dos no alcanza", () => {
    expect(meetsMiniCasesRule({ colorSequenceMaxLevelPassed: 10, nodeMaxLevelPassed: 9 })).toBe(false);
    expect(meetsMiniCasesRule({ colorSequenceMaxLevelPassed: 9, nodeMaxLevelPassed: 15 })).toBe(false);
    expect(meetsMiniCasesRule({ colorSequenceMaxLevelPassed: 0, nodeMaxLevelPassed: 0 })).toBe(false);
  });
});
