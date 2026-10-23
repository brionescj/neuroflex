import { describe, expect, it } from "vitest";

import { formatSeconds, formatTick, formatValue } from "./format";

describe("formatSeconds", () => {
  it("segundos, minutos y minutos con segundos", () => {
    expect(formatSeconds(12.5)).toBe("12,5 s");
    expect(formatSeconds(60)).toBe("1 min");
    expect(formatSeconds(75)).toBe("1 min 15 s");
  });
});

describe("formatValue", () => {
  it("cada unidad con su formato, en espanol", () => {
    expect(formatValue(66.7, "percent")).toBe("66,7 %");
    expect(formatValue(3, "students")).toBe("3");
    expect(formatValue(2.5, "steps")).toBe("2,5");
    expect(formatValue(90, "seconds")).toBe("1 min 30 s");
  });
});

describe("formatTick", () => {
  it("compacta desde 1000", () => {
    expect(formatTick(0)).toBe("0");
    expect(formatTick(250)).toBe("250");
    expect(formatTick(1000)).toBe("1K");
    expect(formatTick(2500)).toBe("2,5K");
  });
});
