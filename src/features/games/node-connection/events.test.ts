import { describe, expect, it } from "vitest";

import {
  MAX_NODE_EVENTS,
  cleanDroppedCount,
  cleanNodeEvents,
  createNodeEventLog,
} from "./events";
import type { NodeEvent } from "./types";

const undo = (t: number): NodeEvent => ({ t, type: "undo" });

describe("createNodeEventLog", () => {
  it("guarda los eventos en el orden en que llegan", () => {
    const log = createNodeEventLog();

    log.push({ t: 100, type: "start", color: "red", row: 0, col: 3 });
    log.push({ t: 900, type: "end", color: "red", len: 3, done: true, back: 0 });

    expect(log.events().map((e) => e.type)).toEqual(["start", "end"]);
    expect(log.dropped()).toBe(0);
  });

  it("devuelve una copia: lo ya entregado no cambia", () => {
    const log = createNodeEventLog();

    log.push(undo(1));
    const delivered = log.events();
    log.push(undo(2));

    expect(delivered).toHaveLength(1);
  });

  it("pasado el tope no guarda mas pero cuenta lo que dejo fuera", () => {
    const log = createNodeEventLog();

    for (let i = 0; i < MAX_NODE_EVENTS + 25; i++) log.push(undo(i));

    expect(log.events()).toHaveLength(MAX_NODE_EVENTS);
    expect(log.dropped()).toBe(25);
  });

  it("se retoma con lo guardado antes de un F5", () => {
    const log = createNodeEventLog({ events: [undo(5), undo(9)], dropped: 3 });

    log.push(undo(12));

    expect(log.events().map((e) => e.t)).toEqual([5, 9, 12]);
    expect(log.dropped()).toBe(3);
  });

  it("una semilla que excede el tope se recorta y lo recortado cuenta como descartado", () => {
    const seed = Array.from({ length: MAX_NODE_EVENTS + 5 }, (_, i) => undo(i));
    const log = createNodeEventLog({ events: seed, dropped: 2 });

    expect(log.events()).toHaveLength(MAX_NODE_EVENTS);
    expect(log.dropped()).toBe(7);
  });
});

describe("cleanNodeEvents", () => {
  it("acepta cada tipo de evento", () => {
    const events: NodeEvent[] = [
      { t: 1, type: "start", color: "blue", row: 1, col: 2, restartCells: 3 },
      { t: 2, type: "end", color: "blue", len: 4, done: false, back: 1 },
      { t: 3, type: "undo" },
      { t: 4, type: "reset", cells: 6 },
      { t: 5, type: "blocked", row: 0, col: 0 },
    ];

    expect(cleanNodeEvents(events)).toEqual(events);
  });

  it("descarta solo los eventos malos", () => {
    const out = cleanNodeEvents([
      undo(1),
      { t: 2, type: "start", color: "magenta", row: 0, col: 0 },
      { t: -1, type: "undo" },
      { t: 3, type: "otro" },
      null,
      "x",
      undo(4),
    ]);

    expect(out.map((e) => e.t)).toEqual([1, 4]);
  });

  it("quita campos desconocidos y acota la cantidad", () => {
    expect(cleanNodeEvents([{ t: 1, type: "undo", extra: "x" }])).toEqual([undo(1)]);
    expect(
      cleanNodeEvents(Array.from({ length: MAX_NODE_EVENTS + 10 }, (_, i) => undo(i))),
    ).toHaveLength(MAX_NODE_EVENTS);
    expect(cleanNodeEvents("no")).toEqual([]);
  });
});

describe("cleanDroppedCount", () => {
  it("acepta enteros no negativos y nada mas", () => {
    expect(cleanDroppedCount(7)).toBe(7);
    expect(cleanDroppedCount(-1)).toBe(0);
    expect(cleanDroppedCount(1.5)).toBe(0);
    expect(cleanDroppedCount("3")).toBe(0);
    expect(cleanDroppedCount(undefined)).toBe(0);
  });
});
