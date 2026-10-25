import { describe, expect, it } from "vitest";

import { toColorSequenceReport } from "../src/features/games/hooks/colorSequenceReport";
import { MAX_NODE_EVENTS as CLIENT_MAX_NODE_EVENTS } from "../src/features/games/node-connection/events";
import { toNodeReport } from "../src/features/games/node-connection/hooks/nodeReport";
import { MAX_NODE_EVENTS } from "./attemptEvents";
import { parseLevelReport } from "./gameAttempts";

// El contrato entre lo que arma el navegador y lo que acepta el servidor
// existe dos veces. Si alguien cambia un lado y olvida el otro, el servidor
// descartaria los eventos en silencio. Este test lo detecta: pasa el reporte
// real del cliente por el validador real del servidor.
const NOW = new Date("2026-10-14T12:00:00.000Z");

describe("seriacion: el reporte del cliente pasa el validador del servidor", () => {
  const report = toColorSequenceReport(
    {
      level: 3,
      tryNumber: 1,
      passed: false,
      sequenceLength: 4,
      correctCount: 2,
      timeMs: 2400,
      activeMsGross: 9000,
      activeMsNet: 8000,
      completedAt: "2026-10-14T11:00:00.000Z",
      shown: ["blue", "red", "green", "orange"],
      illuminationMs: 3600,
      taps: [
        { c: "blue", t: 900 },
        { c: "green", t: 1700 },
        { c: "red", t: 2600 },
        { c: "orange", t: 3300 },
      ],
    },
    NOW.toISOString(),
  );

  it("conserva secuencia, inicio de respuesta y los cuatro toques", () => {
    const parsed = parseLevelReport("color-sequence", report, NOW);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.value.events).toHaveLength(4);
    expect(parsed.value.metrics.shownSequence).toEqual(["blue", "red", "green", "orange"]);
    expect(parsed.value.metrics.illuminationMs).toBe(3600);
    expect(parsed.value.metrics).not.toHaveProperty("eventsDiscarded");
  });
});

describe("nodos: el reporte del cliente pasa el validador del servidor", () => {
  const events = [
    { t: 3100, type: "start" as const, color: "red" as const, row: 0, col: 3 },
    { t: 3900, type: "blocked" as const, row: 1, col: 3 },
    { t: 4200, type: "end" as const, color: "red" as const, len: 3, done: false, back: 1 },
    { t: 5000, type: "undo" as const },
    { t: 6000, type: "start" as const, color: "blue" as const, row: 0, col: 2, restartCells: 2 },
    { t: 7000, type: "reset" as const, cells: 5 },
  ];

  it("ningun evento se pierde ni se altera", () => {
    const report = toNodeReport(
      { level: 1, tryNumber: 1, solved: true, passed: true, pairCount: 2, timeMs: 8000, undoCount: 1, resetCount: 1, events, eventsDropped: 3 },
      NOW.toISOString(),
    );
    const parsed = parseLevelReport("node-connection", report, NOW);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.value.events).toEqual(events);
    expect(parsed.value.metrics.eventsDropped).toBe(3);
  });

  it("el tope de eventos es el mismo en navegador y servidor", () => {
    expect(CLIENT_MAX_NODE_EVENTS).toBe(MAX_NODE_EVENTS);
  });
});
