import { describe, expect, it } from "vitest";

import { formatDuration } from "./format";

describe("formatDuration", () => {
  it("da minutos y segundos con dos cifras", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(83_000)).toBe("1:23");
    expect(formatDuration(9_000)).toBe("0:09");
  });

  it("redondea al segundo mas cercano", () => {
    expect(formatDuration(59_600)).toBe("1:00");
    expect(formatDuration(1_400)).toBe("0:01");
  });

  it("no muestra tiempos negativos", () => {
    expect(formatDuration(-5_000)).toBe("0:00");
  });
});
