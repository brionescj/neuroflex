import { describe, expect, it } from "vitest";

import {
  MAX_SELECTION_LOG,
  createBehaviorTracker,
  parseBehavior,
} from "./behavior";

function clockAt(start = 1_000_000) {
  let t = start;

  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

const KEYS = ["k1", "k2", "k3", "k4"];

describe("createBehaviorTracker", () => {
  it("registra toques, arrepentimientos y tiempos de un caso", () => {
    const clock = clockAt();
    const tracker = createBehaviorTracker(clock.now);

    tracker.noteDistractor("gato", "meow");
    tracker.twistShown();
    clock.advance(4_000); // lee el giro
    tracker.beginOrdering(KEYS);

    clock.advance(1_500);
    tracker.record("k2", "add", 1_500);
    tracker.record("k2", "remove", 2_100); // se arrepiente
    tracker.record("k3", "add", 3_000);
    tracker.record("k2", "add", 3_400);
    clock.advance(8_000);

    expect(tracker.finish()).toEqual({
      displayedOptionKeys: KEYS,
      taps: 3,
      removals: 1,
      firstTapMs: 1_500,
      twistReadMs: 4_000,
      wallMs: 9_500,
      distractorMotif: "gato",
      distractorSound: "meow",
      selectionLog: [
        { o: "k2", a: "add", t: 1_500 },
        { o: "k2", a: "remove", t: 2_100 },
        { o: "k3", a: "add", t: 3_000 },
        { o: "k2", a: "add", t: 3_400 },
      ],
    });
  });

  it("sin toques: primer toque nulo y contadores en cero", () => {
    const clock = clockAt();
    const tracker = createBehaviorTracker(clock.now);

    tracker.beginOrdering(KEYS);

    expect(tracker.finish()).toMatchObject({
      taps: 0,
      removals: 0,
      firstTapMs: null,
      twistReadMs: null,
      distractorMotif: null,
      selectionLog: [],
    });
  });

  it("reintentar el envio no alarga el tiempo real ni cambia el resultado", () => {
    const clock = clockAt();
    const tracker = createBehaviorTracker(clock.now);

    tracker.beginOrdering(KEYS);
    clock.advance(5_000);
    const first = tracker.finish();
    clock.advance(60_000);

    expect(tracker.finish()).toEqual(first);
    expect(first?.wallMs).toBe(5_000);
  });

  it("cada caso empieza de cero", () => {
    const clock = clockAt();
    const tracker = createBehaviorTracker(clock.now);

    tracker.beginOrdering(KEYS);
    tracker.record("k1", "add", 100);
    tracker.finish();

    tracker.beginOrdering(["k4", "k3", "k2", "k1"]);

    expect(tracker.finish()).toMatchObject({
      displayedOptionKeys: ["k4", "k3", "k2", "k1"],
      taps: 0,
      selectionLog: [],
    });
  });

  it("el registro se corta pero los contadores siguen exactos", () => {
    const tracker = createBehaviorTracker(clockAt().now);

    tracker.beginOrdering(KEYS);
    for (let i = 0; i < MAX_SELECTION_LOG + 20; i++) {
      tracker.record("k1", i % 2 === 0 ? "add" : "remove", i);
    }

    const result = tracker.finish();

    expect(result?.selectionLog).toHaveLength(MAX_SELECTION_LOG);
    expect((result?.taps ?? 0) + (result?.removals ?? 0)).toBe(MAX_SELECTION_LOG + 20);
  });

  it("antes de ordenar no hay nada que informar", () => {
    const tracker = createBehaviorTracker(clockAt().now);

    tracker.record("k1", "add", 10);

    expect(tracker.finish()).toBeNull();
  });
});

describe("parseBehavior", () => {
  const valid = {
    displayedOptionKeys: KEYS,
    taps: 4,
    removals: 0,
    firstTapMs: 900,
    twistReadMs: 3_000,
    wallMs: 7_000,
    distractorMotif: "pez",
    distractorSound: "splash",
    selectionLog: [{ o: "k1", a: "add", t: 900 }],
  };

  it("acepta un comportamiento valido", () => {
    expect(parseBehavior(valid)).toEqual(valid);
  });

  it("rechaza lo que no tiene la forma esperada", () => {
    expect(parseBehavior(null)).toBeNull();
    expect(parseBehavior("x")).toBeNull();
    expect(parseBehavior({ ...valid, displayedOptionKeys: ["k1"] })).toBeNull();
    expect(parseBehavior({ ...valid, taps: -1 })).toBeNull();
    expect(parseBehavior({ ...valid, taps: 1.5 })).toBeNull();
    expect(parseBehavior({ ...valid, wallMs: "7000" })).toBeNull();
    expect(parseBehavior({ ...valid, selectionLog: "no" })).toBeNull();
  });

  it("descarta eventos malos y valores sueltos sin rechazar todo", () => {
    const parsed = parseBehavior({
      ...valid,
      firstTapMs: "x",
      distractorMotif: 5,
      selectionLog: [{ o: "k1", a: "add", t: 1 }, { o: "k1", a: "borrar", t: 2 }, null],
    });

    expect(parsed?.firstTapMs).toBeNull();
    expect(parsed?.distractorMotif).toBeNull();
    expect(parsed?.selectionLog).toEqual([{ o: "k1", a: "add", t: 1 }]);
  });
});
