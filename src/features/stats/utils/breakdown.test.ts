import { describe, expect, it } from "vitest";

import { breakdownText } from "./breakdown";

const base = { states: ["finished", "failed", "open"] as const, selected: 0, withData: 0 };

describe("breakdownText", () => {
  it("dice cuántas partidas hay y cómo terminaron", () => {
    expect(breakdownText({ ...base, states: [...base.states], total: 27, finished: 12, failed: 14, open: 1 })).toBe(
      "27 partidas: 12 terminadas · 14 fallidas · 1 sin terminar",
    );
  });

  it("usa el singular", () => {
    expect(breakdownText({ ...base, states: [...base.states], total: 1, finished: 1, failed: 0, open: 0 })).toBe(
      "1 partida: 1 terminada · 0 fallidas · 0 sin terminar",
    );
  });
});
