import { describe, expect, it } from "vitest";

import {
  MAX_NODE_EVENTS,
  analyzeColorSequenceResponse,
  analyzeNodeEvents,
  reconcileColorSequenceEvents,
  sanitizeColorTaps,
  sanitizeNodeEvents,
  sanitizeShownSequence,
} from "./attemptEvents";

const taps = (colors: string[], step = 700) =>
  colors.map((c, i) => ({ c, t: 1500 + i * step }));

describe("sanitizeShownSequence y sanitizeColorTaps", () => {
  it("aceptan colores conocidos", () => {
    expect(sanitizeShownSequence(["blue", "red"])).toEqual(["blue", "red"]);
    expect(sanitizeColorTaps([{ c: "blue", t: 900.4 }, { c: "red", t: 1500 }])).toEqual([
      { c: "blue", t: 900 },
      { c: "red", t: 1500 },
    ]);
  });

  it("rechazan lo que no es una lista valida", () => {
    expect(sanitizeShownSequence([])).toBeNull();
    expect(sanitizeShownSequence(["purple"])).toBeNull();
    expect(sanitizeShownSequence("blue")).toBeNull();
    expect(sanitizeColorTaps(undefined)).toBeNull();
    expect(sanitizeColorTaps([])).toBeNull();
    expect(sanitizeColorTaps([{ c: "blue" }])).toBeNull();
    expect(sanitizeColorTaps([{ c: "blue", t: -1 }])).toBeNull();
    expect(sanitizeColorTaps([{ c: "blue", t: Infinity }])).toBeNull();
  });

  it("un toque malo o tiempos que retroceden invalidan toda la lista", () => {
    expect(sanitizeColorTaps([{ c: "blue", t: 1 }, { c: "x", t: 2 }])).toBeNull();
    expect(sanitizeColorTaps([{ c: "blue", t: 900 }, { c: "red", t: 100 }])).toBeNull();
  });

  it("acotan la cantidad", () => {
    const many = Array.from({ length: 501 }, (_, i) => ({ c: "blue", t: i }));

    expect(sanitizeColorTaps(many)).toBeNull();
  });
});

describe("analyzeColorSequenceResponse", () => {
  const shown = ["blue", "green", "red", "orange", "blue"];

  it("respuesta perfecta: sin errores", () => {
    const out = analyzeColorSequenceResponse(shown, taps(shown));

    expect(out).toMatchObject({
      positionCorrect: [true, true, true, true, true],
      firstErrorPosition: null,
      swapErrors: 0,
      substitutionErrors: 0,
      firstTapMs: 1500,
      meanInterTapMs: 700,
      maxPauseMs: 700,
    });
  });

  it("detecta la primera posicion errada y la sustitucion", () => {
    const out = analyzeColorSequenceResponse(
      shown,
      taps(["blue", "green", "orange", "orange", "blue"]),
    );

    expect(out.positionCorrect).toEqual([true, true, false, true, true]);
    expect(out.firstErrorPosition).toBe(3);
    expect(out.substitutionErrors).toBe(1);
    expect(out.swapErrors).toBe(0);
  });

  it("dos posiciones seguidas intercambiadas son un intercambio, no dos errores", () => {
    const out = analyzeColorSequenceResponse(
      shown,
      taps(["blue", "red", "green", "orange", "blue"]),
    );

    expect(out.firstErrorPosition).toBe(2);
    expect(out.swapErrors).toBe(1);
    expect(out.substitutionErrors).toBe(0);
  });

  it("mezcla de intercambio y sustitucion", () => {
    const out = analyzeColorSequenceResponse(
      shown,
      taps(["green", "blue", "red", "orange", "red"]),
    );

    expect(out.swapErrors).toBe(1);
    expect(out.substitutionErrors).toBe(1);
    expect(out.firstErrorPosition).toBe(1);
  });

  it("mide el ritmo: pausa mas larga y promedio", () => {
    const out = analyzeColorSequenceResponse(["blue", "red", "green"], [
      { c: "blue", t: 2000 },
      { c: "red", t: 2500 },
      { c: "green", t: 9500 },
    ]);

    expect(out.firstTapMs).toBe(2000);
    expect(out.maxPauseMs).toBe(7000);
    expect(out.meanInterTapMs).toBe(3750);
  });

  it("con un solo toque no hay pausas", () => {
    const out = analyzeColorSequenceResponse(["blue"], [{ c: "blue", t: 800 }]);

    expect(out.maxPauseMs).toBeNull();
    expect(out.meanInterTapMs).toBeNull();
  });
});

describe("reconcileColorSequenceEvents", () => {
  const metrics = {
    sequenceLength: 3,
    correctCount: 2,
    percent: 67,
    shownSequence: ["blue", "red", "green"],
    illuminationMs: 2700.2,
  };
  const events = [
    { c: "blue", t: 800 },
    { c: "green", t: 1500 },
    { c: "green", t: 2100 },
  ];

  it("un nivel sin eventos (anterior al registro) pasa intacto", () => {
    const legacy = { sequenceLength: 3, correctCount: 2 };
    const out = reconcileColorSequenceEvents(legacy, undefined);

    expect(out.metrics).toBe(legacy);
    expect(out.events).toBeUndefined();
  });

  it("conserva secuencia y toques coherentes", () => {
    const out = reconcileColorSequenceEvents(metrics, events);

    expect(out.events).toHaveLength(3);
    expect(out.metrics.shownSequence).toEqual(["blue", "red", "green"]);
    expect(out.metrics.illuminationMs).toBe(2700);
    expect(out.metrics).not.toHaveProperty("eventsDiscarded");
  });

  it("descarta todo si los aciertos informados no calzan con los toques", () => {
    const out = reconcileColorSequenceEvents({ ...metrics, correctCount: 3 }, events);

    expect(out.events).toBeUndefined();
    expect(out.metrics).not.toHaveProperty("shownSequence");
    expect(out.metrics).toMatchObject({ correctCount: 3, eventsDiscarded: true });
  });

  it("descarta si el largo no calza", () => {
    expect(
      reconcileColorSequenceEvents(metrics, events.slice(0, 2)).metrics.eventsDiscarded,
    ).toBe(true);
    expect(
      reconcileColorSequenceEvents({ ...metrics, sequenceLength: 4 }, events).metrics
        .eventsDiscarded,
    ).toBe(true);
  });

  it("descarta si falta una de las dos partes o vienen mal formadas", () => {
    expect(reconcileColorSequenceEvents(metrics, undefined).metrics.eventsDiscarded).toBe(true);
    expect(
      reconcileColorSequenceEvents({ ...metrics, shownSequence: "x" }, events).metrics
        .eventsDiscarded,
    ).toBe(true);
    expect(reconcileColorSequenceEvents(metrics, [{ c: "blue" }]).metrics.eventsDiscarded).toBe(
      true,
    );
  });

  it("nunca borra los datos del puntaje", () => {
    const out = reconcileColorSequenceEvents({ ...metrics, correctCount: 0 }, events);

    expect(out.metrics).toMatchObject({ sequenceLength: 3, correctCount: 0, percent: 67 });
  });
});

describe("sanitizeNodeEvents", () => {
  it("acepta cada tipo de evento con sus campos", () => {
    const out = sanitizeNodeEvents([
      { t: 3200, type: "start", color: "red", row: 0, col: 2 },
      { t: 4100, type: "end", color: "red", len: 4, done: true, back: 1 },
      { t: 5000, type: "undo" },
      { t: 5600, type: "reset", cells: 7 },
      { t: 6000, type: "blocked", row: 1, col: 1 },
      { t: 7000, type: "start", color: "blue", row: 1, col: 1, restartCells: 3 },
    ]);

    expect(out.map((e) => e.type)).toEqual(["start", "end", "undo", "reset", "blocked", "start"]);
    expect(out[5]).toMatchObject({ restartCells: 3 });
  });

  it("descarta solo lo malo y conserva el resto", () => {
    const out = sanitizeNodeEvents([
      { t: 100, type: "start", color: "red", row: 0, col: 0 },
      { t: 200, type: "start", color: "magenta", row: 0, col: 0 },
      { t: 300, type: "teleport" },
      { t: -5, type: "undo" },
      null,
      { t: 400, type: "end", color: "red", len: 2, done: "si", back: 0 },
      { t: 500, type: "undo" },
    ]);

    expect(out.map((e) => e.t)).toEqual([100, 500]);
  });

  it("ignora campos desconocidos, los ordena por tiempo y acota la cantidad", () => {
    const out = sanitizeNodeEvents([
      { t: 900, type: "undo", extra: "x".repeat(1000) },
      { t: 100, type: "undo" },
    ]);

    expect(out).toEqual([{ t: 100, type: "undo" }, { t: 900, type: "undo" }]);

    const many = Array.from({ length: MAX_NODE_EVENTS + 50 }, (_, i) => ({ t: i, type: "undo" }));

    expect(sanitizeNodeEvents(many)).toHaveLength(MAX_NODE_EVENTS);
    expect(sanitizeNodeEvents("no")).toEqual([]);
    expect(sanitizeNodeEvents(undefined)).toEqual([]);
  });
});

describe("analyzeNodeEvents", () => {
  const events = sanitizeNodeEvents([
    { t: 6200, type: "start", color: "blue", row: 0, col: 0 },
    { t: 7000, type: "end", color: "blue", len: 3, done: false, back: 0 },
    { t: 7400, type: "start", color: "red", row: 2, col: 2 },
    { t: 8100, type: "end", color: "red", len: 5, done: true, back: 1 },
    { t: 15000, type: "start", color: "blue", row: 0, col: 0, restartCells: 2 },
    { t: 15900, type: "end", color: "blue", len: 4, done: true, back: 0 },
  ]);

  it("mide la planificacion: tiempo y color del primer trazo", () => {
    const out = analyzeNodeEvents(events);

    expect(out.firstStrokeMs).toBe(6200);
    expect(out.firstStrokeColor).toBe("blue");
  });

  it("orden de colores sin repetir, trazos y trazos abiertos", () => {
    const out = analyzeNodeEvents(events);

    expect(out.colorOrder).toEqual(["blue", "red"]);
    expect(out.strokeStarts).toBe(3);
    expect(out.strokesLeftOpen).toBe(1);
    expect(out.eventCount).toBe(6);
  });

  it("pausas: la mayor y cuantas son de 5 s o mas", () => {
    const out = analyzeNodeEvents(events);

    expect(out.maxPauseMs).toBe(6900);
    expect(out.longPauses).toBe(1);
  });

  it("sin eventos o sin trazos no inventa datos", () => {
    expect(analyzeNodeEvents([])).toMatchObject({
      eventCount: 0,
      firstStrokeMs: null,
      firstStrokeColor: null,
      colorOrder: [],
      maxPauseMs: null,
    });
    expect(analyzeNodeEvents(sanitizeNodeEvents([{ t: 10, type: "undo" }])).firstStrokeMs).toBeNull();
  });
});
