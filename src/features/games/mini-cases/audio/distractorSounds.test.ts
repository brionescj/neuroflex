import { describe, expect, it } from "vitest";

import { DISTRACTOR_SOUNDS, pickDistractorSound, playDistractorSound } from "./distractorSounds";

type Call = { kind: string; time?: number; value?: number };

/** Un AudioContext falso que anota cuando arranca y se detiene cada fuente y cuanto sube el volumen. */
function fakeContext() {
  const calls: Call[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime: (value: number, time: number) => calls.push({ kind: "set", time, value }),
    linearRampToValueAtTime: (value: number, time: number) => calls.push({ kind: "ramp", time, value }),
    exponentialRampToValueAtTime: (value: number, time: number) => calls.push({ kind: "ramp", time, value }),
  });
  const node = (): Record<string, unknown> => {
    const self: Record<string, unknown> = {
      connect: (to: unknown) => to,
      gain: param(),
      frequency: param(),
      Q: param(),
      start: (time: number) => calls.push({ kind: "start", time }),
      stop: (time: number) => calls.push({ kind: "stop", time }),
    };

    return self;
  };
  const ctx = {
    currentTime: 0,
    sampleRate: 8000,
    createBuffer: (_c: number, size: number) => ({ getChannelData: () => new Float32Array(size) }),
    createBufferSource: node,
    createOscillator: node,
    createGain: node,
    createBiquadFilter: node,
  };

  return { ctx: ctx as unknown as AudioContext, calls };
}

describe("sonidos del distractor", () => {
  it("son exactamente tres", () => {
    expect([...DISTRACTOR_SOUNDS]).toEqual(["lluvia", "olas", "campanillas"]);
  });

  it("se elige al azar entre los tres, y siempre uno válido", () => {
    const seen = new Set<string>();

    for (let i = 0; i < 300; i++) seen.add(pickDistractorSound());

    expect([...seen].sort()).toEqual([...DISTRACTOR_SOUNDS].sort());
    expect(pickDistractorSound(() => 0.9999999)).toBe("campanillas");
    expect(pickDistractorSound(() => 0)).toBe("lluvia");
  });

  it.each(DISTRACTOR_SOUNDS)("%s dura 4 segundos: ninguna fuente suena más allá", (name) => {
    const { ctx, calls } = fakeContext();

    playDistractorSound(ctx, { connect: () => undefined } as unknown as AudioNode, name, 4);

    const starts = calls.filter((c) => c.kind === "start");
    const stops = calls.filter((c) => c.kind === "stop");

    expect(starts.length).toBeGreaterThan(0);
    expect(stops.length).toBe(starts.length);
    expect(Math.max(...stops.map((c) => c.time ?? 0))).toBeLessThanOrEqual(4.2);
    expect(Math.min(...starts.map((c) => c.time ?? 0))).toBeGreaterThanOrEqual(0);
  });

  it.each(DISTRACTOR_SOUNDS)("%s es suave: ningún volumen individual pasa de 0,2", (name) => {
    const { ctx, calls } = fakeContext();

    playDistractorSound(ctx, { connect: () => undefined } as unknown as AudioNode, name, 4);

    // El volumen general llega a 1 (es el multiplicador); lo que se programa en cada fuente es bajo.
    const peaks = calls.filter((c) => c.kind === "ramp" && (c.value ?? 0) > 0.2 && (c.value ?? 0) < 1);

    expect(peaks).toEqual([]);
  });
});
