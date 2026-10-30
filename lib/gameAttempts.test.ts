import { describe, expect, it } from "vitest";

import {
  ageAt,
  buildStudentSnapshot,
  isAttemptGameId,
  parseAttemptInfo,
  parseCloseStatus,
  parseDeviceInfo,
  parseLevelReport,
  scoreColorSequenceLevel,
  summarizeResults,
} from "./gameAttempts";

const NOW = new Date("2026-10-14T12:00:00.000Z");

const validAttempt = {
  attemptId: "abcdefgh12345678",
  sessionId: "sess-1234567890",
  startedAt: "2026-10-14T11:00:00.000Z",
  contentVersion: "color-sequence-1",
  device: { pointer: "touch", viewportWidth: 390, viewportHeight: 800 },
};

describe("isAttemptGameId", () => {
  it("acepta solo los tres juegos", () => {
    expect(isAttemptGameId("color-sequence")).toBe(true);
    expect(isAttemptGameId("mini-cases")).toBe(true);
    expect(isAttemptGameId("node-connection")).toBe(true);
    expect(isAttemptGameId("otro")).toBe(false);
    expect(isAttemptGameId(undefined)).toBe(false);
  });
});

describe("parseAttemptInfo", () => {
  it("acepta un bloque valido", () => {
    const parsed = parseAttemptInfo(validAttempt, NOW);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.attemptId).toBe("abcdefgh12345678");
      expect(parsed.value.startedAt.toISOString()).toBe(
        "2026-10-14T11:00:00.000Z",
      );
      expect(parsed.value.device.pointer).toBe("touch");
    }
  });

  it("rechaza identificadores malos", () => {
    expect(parseAttemptInfo(null, NOW).ok).toBe(false);
    expect(parseAttemptInfo({ ...validAttempt, attemptId: "corto" }, NOW).ok).toBe(false);
    expect(
      parseAttemptInfo({ ...validAttempt, attemptId: "con espacios aqui" }, NOW).ok,
    ).toBe(false);
    expect(parseAttemptInfo({ ...validAttempt, sessionId: 5 }, NOW).ok).toBe(false);
  });

  it("una fecha futura o absurda se reemplaza por la hora del servidor", () => {
    for (const startedAt of ["2030-01-01T00:00:00Z", "no es fecha", "1990-01-01T00:00:00Z", 7]) {
      const parsed = parseAttemptInfo({ ...validAttempt, startedAt }, NOW);

      expect(parsed.ok && parsed.value.startedAt.getTime()).toBe(NOW.getTime());
    }
  });
});

describe("parseDeviceInfo", () => {
  it("rellena valores por defecto ante basura", () => {
    expect(parseDeviceInfo("x")).toMatchObject({
      pointer: "mixed",
      viewportWidth: 0,
      pixelRatio: 1,
      platform: "desconocido",
    });
  });

  it("acota textos y descarta numeros fuera de rango", () => {
    const info = parseDeviceInfo({
      pointer: "mouse",
      viewportWidth: -5,
      pixelRatio: 99,
      platform: "x".repeat(500),
    });

    expect(info.viewportWidth).toBe(0);
    expect(info.pixelRatio).toBe(1);
    expect(info.platform).toHaveLength(60);
  });
});

describe("parseLevelReport", () => {
  const seriacion = {
    key: "3",
    index: 3,
    metrics: { sequenceLength: 5, correctCount: 4, percent: 80 },
    activeMsGross: 12_000,
    activeMsNet: 9_000,
    completedAt: "2026-10-14T11:30:00.000Z",
  };

  it("acepta un nivel de seriacion y usa tryNumber 1 por defecto", () => {
    const parsed = parseLevelReport("color-sequence", seriacion, NOW);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.tryNumber).toBe(1);
      expect(parsed.value.orderedOptionKeys).toBeNull();
    }
  });

  it("acepta hasta 3 intentos por nivel y rechaza un cuarto", () => {
    for (const tryNumber of [1, 2, 3]) {
      expect(parseLevelReport("color-sequence", { ...seriacion, tryNumber }, NOW).ok).toBe(true);
    }

    expect(parseLevelReport("color-sequence", { ...seriacion, tryNumber: 4 }, NOW).ok).toBe(false);
    // nodos tambien tiene 3 intentos por nivel; Mini casos no tiene reintentos
    const nodos = { ...seriacion, metrics: { pairCount: 3, undoCount: 0, resetCount: 0 } };

    expect(parseLevelReport("node-connection", { ...nodos, tryNumber: 3 }, NOW).ok).toBe(true);
    expect(parseLevelReport("node-connection", { ...nodos, tryNumber: 4 }, NOW).ok).toBe(false);
  });

  describe("eventos finos", () => {
    const withEvents = {
      ...seriacion,
      metrics: {
        ...seriacion.metrics,
        shownSequence: ["blue", "red", "green", "orange", "blue"],
        illuminationMs: 4500,
      },
      events: [
        { c: "blue", t: 900 },
        { c: "red", t: 1600 },
        { c: "green", t: 2300 },
        { c: "orange", t: 3000 },
        { c: "red", t: 3700 },
      ],
    };

    it("seriacion: conserva los toques coherentes con los aciertos", () => {
      const parsed = parseLevelReport("color-sequence", withEvents, NOW);

      expect(parsed.ok && parsed.value.events).toHaveLength(5);
      expect(parsed.ok && parsed.value.metrics.shownSequence).toHaveLength(5);
    });

    it("seriacion: toques que no calzan con los aciertos se descartan, el nivel no", () => {
      const parsed = parseLevelReport(
        "color-sequence",
        { ...withEvents, metrics: { ...withEvents.metrics, correctCount: 5 } },
        NOW,
      );

      expect(parsed.ok).toBe(true);
      expect(parsed.ok && parsed.value.events).toBeUndefined();
      expect(parsed.ok && parsed.value.metrics).toMatchObject({
        correctCount: 5,
        eventsDiscarded: true,
      });
    });

    it("seriacion sin eventos (cliente antiguo) sigue siendo valido", () => {
      const parsed = parseLevelReport("color-sequence", seriacion, NOW);

      expect(parsed.ok && parsed.value.events).toBeUndefined();
      expect(parsed.ok && parsed.value.metrics).not.toHaveProperty("eventsDiscarded");
    });

    it("nodos: limpia los eventos y conserva el nivel aunque algunos esten mal", () => {
      const parsed = parseLevelReport(
        "node-connection",
        {
          ...seriacion,
          metrics: { pairCount: 3, undoCount: 1, resetCount: 0, eventsDropped: 2 },
          events: [
            { t: 3000, type: "start", color: "red", row: 0, col: 0 },
            { t: 3500, type: "start", color: "nope", row: 0, col: 0 },
            { t: 4000, type: "undo" },
          ],
        },
        NOW,
      );

      expect(parsed.ok && parsed.value.events).toHaveLength(2);
    });

    it("nodos: un contador de eventos descartados invalido se rechaza", () => {
      expect(
        parseLevelReport(
          "node-connection",
          {
            ...seriacion,
            metrics: { pairCount: 3, undoCount: 0, resetCount: 0, eventsDropped: -1 },
          },
          NOW,
        ).ok,
      ).toBe(false);
    });

    it("mini casos ignora los eventos", () => {
      const parsed = parseLevelReport(
        "mini-cases",
        {
          ...seriacion,
          key: "caso-1",
          index: 1,
          metrics: { decisionTimeMs: 1000 },
          orderedOptionKeys: ["a", "b", "c", "d"],
          events: [{ t: 1, type: "undo" }],
        },
        NOW,
      );

      expect(parsed.ok && parsed.value.events).toBeUndefined();
    });
  });

  it("el neto nunca supera al bruto", () => {
    const parsed = parseLevelReport(
      "color-sequence",
      { ...seriacion, activeMsNet: 50_000 },
      NOW,
    );

    expect(parsed.ok && parsed.value.activeMsNet).toBe(12_000);
  });

  it("rechaza aciertos mayores que la secuencia", () => {
    const parsed = parseLevelReport(
      "color-sequence",
      { ...seriacion, metrics: { sequenceLength: 3, correctCount: 4 } },
      NOW,
    );

    expect(parsed.ok).toBe(false);
  });

  it("rechaza claves, indices y tiempos invalidos", () => {
    expect(parseLevelReport("color-sequence", { ...seriacion, key: "a b" }, NOW).ok).toBe(false);
    expect(parseLevelReport("color-sequence", { ...seriacion, index: 0 }, NOW).ok).toBe(false);
    expect(parseLevelReport("color-sequence", { ...seriacion, activeMsGross: -1 }, NOW).ok).toBe(false);
    expect(
      parseLevelReport("color-sequence", { ...seriacion, activeMsGross: 25 * 3600 * 1000 }, NOW).ok,
    ).toBe(false);
    expect(parseLevelReport("color-sequence", null, NOW).ok).toBe(false);
  });

  it("rechaza metricas demasiado grandes o demasiado profundas", () => {
    const big = { ...seriacion.metrics, extra: "x".repeat(25_000) };
    const deep = { ...seriacion.metrics, a: { b: { c: { d: { e: { f: 1 } } } } } };

    expect(parseLevelReport("color-sequence", { ...seriacion, metrics: big }, NOW).ok).toBe(false);
    expect(parseLevelReport("color-sequence", { ...seriacion, metrics: deep }, NOW).ok).toBe(false);
  });

  it("valida las metricas de nodos", () => {
    const nodes = {
      key: "2",
      index: 2,
      metrics: { pairCount: 3, undoCount: 1, resetCount: 0 },
      activeMsGross: 5000,
      activeMsNet: 5000,
      completedAt: "2026-10-14T11:30:00.000Z",
    };

    expect(parseLevelReport("node-connection", nodes, NOW).ok).toBe(true);
    expect(
      parseLevelReport("node-connection", { ...nodes, metrics: { pairCount: 3 } }, NOW).ok,
    ).toBe(false);
  });

  it("nodos: acepta contadores opcionales validos y rechaza invalidos", () => {
    const nodes = {
      key: "2",
      index: 2,
      metrics: { pairCount: 3, undoCount: 1, resetCount: 0, cellsErased: 7, resetCells: 4 },
      activeMsGross: 5000,
      activeMsNet: 5000,
      completedAt: "2026-10-14T11:30:00.000Z",
    };

    expect(parseLevelReport("node-connection", nodes, NOW).ok).toBe(true);
    expect(
      parseLevelReport("node-connection", { ...nodes, metrics: { ...nodes.metrics, cellsErased: -1 } }, NOW).ok,
    ).toBe(false);
    expect(
      parseLevelReport("node-connection", { ...nodes, metrics: { ...nodes.metrics, blockedCount: 2.5 } }, NOW).ok,
    ).toBe(false);
  });

  it("mini casos exige exactamente 4 opciones ordenadas", () => {
    const caso = {
      key: "caso-1",
      index: 1,
      metrics: {},
      activeMsGross: 4000,
      activeMsNet: 4000,
      completedAt: "2026-10-14T11:30:00.000Z",
      orderedOptionKeys: ["a", "b", "c", "d"],
    };

    const ok = parseLevelReport("mini-cases", caso, NOW);

    expect(ok.ok && ok.value.orderedOptionKeys).toEqual(["a", "b", "c", "d"]);
    expect(
      parseLevelReport("mini-cases", { ...caso, orderedOptionKeys: ["a", "b"] }, NOW).ok,
    ).toBe(false);
    expect(
      parseLevelReport("mini-cases", { ...caso, orderedOptionKeys: undefined }, NOW).ok,
    ).toBe(false);
    expect(
      parseLevelReport("mini-cases", { ...caso, orderedOptionKeys: ["a", "b", "c", 4] }, NOW).ok,
    ).toBe(false);
  });
});

describe("parseCloseStatus", () => {
  it("acepta finished y failed", () => {
    expect(parseCloseStatus("finished")).toEqual({ ok: true, value: "finished" });
    expect(parseCloseStatus("failed")).toEqual({ ok: true, value: "failed" });
    expect(parseCloseStatus("in_progress").ok).toBe(false);
  });
});

describe("ageAt", () => {
  const at = new Date("2026-10-14T12:00:00.000Z");

  it("calcula anos cumplidos en ambos formatos", () => {
    expect(ageAt("2000-10-14", at)).toBe(26);
    expect(ageAt("14-10-2000", at)).toBe(26);
    expect(ageAt("14/10/2000", at)).toBe(26);
  });

  it("no cuenta el cumpleanos que aun no llega", () => {
    expect(ageAt("2000-10-15", at)).toBe(25);
    expect(ageAt("2000-11-01", at)).toBe(25);
  });

  it("devuelve null ante datos faltantes, raros o fuera de rango", () => {
    expect(ageAt(null, at)).toBeNull();
    expect(ageAt("", at)).toBeNull();
    expect(ageAt("ayer", at)).toBeNull();
    expect(ageAt("2000-13-01", at)).toBeNull();
    expect(ageAt("2025-01-01", at)).toBeNull();
    expect(ageAt("1800-01-01", at)).toBeNull();
  });
});

describe("buildStudentSnapshot", () => {
  it("copia los datos presentes y deja null los ausentes", () => {
    const snapshot = buildStudentSnapshot(
      {
        paralelo: 2,
        entryYear: 2024,
        birthDate: "2000-01-01",
        comuna: " Temuco ",
        region: "La Araucania",
      },
      NOW,
    );

    expect(snapshot).toEqual({
      paralelo: 2,
      entryYear: 2024,
      ageAtStart: 26,
      studyShift: null,
      comuna: "Temuco",
      region: "La Araucania",
      gender: null,
      university: null,
    });
  });

  it("copia genero y universidad cuando el admin los cargo", () => {
    const snapshot = buildStudentSnapshot({ gender: "female", university: "uvm" }, NOW);

    expect(snapshot.gender).toBe("female");
    expect(snapshot.university).toBe("uvm");
    expect(snapshot).not.toHaveProperty("studyPlan");
  });

  it("sin ficha del estudiante todo queda null", () => {
    expect(Object.values(buildStudentSnapshot(null, NOW)).every((v) => v === null)).toBe(true);
  });
});

describe("scoreColorSequenceLevel", () => {
  it("calcula porcentaje, umbral y aprobacion con enteros", () => {
    expect(scoreColorSequenceLevel(1, 2, 1)).toEqual({ percent: 50, thresholdPercent: 60, passed: false });
    expect(scoreColorSequenceLevel(1, 2, 2)).toEqual({ percent: 100, thresholdPercent: 60, passed: true });
    expect(scoreColorSequenceLevel(4, 5, 3)).toEqual({ percent: 60, thresholdPercent: 60, passed: true });
    expect(scoreColorSequenceLevel(8, 9, 6)).toMatchObject({ thresholdPercent: 70, passed: false });
    expect(scoreColorSequenceLevel(10, 11, 10)).toMatchObject({ thresholdPercent: 90, passed: true });
    expect(scoreColorSequenceLevel(11, 12, 9)).toMatchObject({ thresholdPercent: 75, passed: true });
    expect(scoreColorSequenceLevel(11, 12, 8)).toMatchObject({ thresholdPercent: 75, passed: false });
  });
});

describe("summarizeResults", () => {
  it("seriacion con reintentos: nivel maximo pasado, a la primera y fallos", () => {
    const row = (
      index: number,
      tryNumber: number,
      correctCount: number,
    ): Parameters<typeof summarizeResults>[1][number] => ({
      index,
      tryNumber,
      metrics: { sequenceLength: index + 1, correctCount, passed: correctCount >= index },
      activeMsGross: 1000,
      activeMsNet: 800,
    });

    const summary = summarizeResults("color-sequence", [
      row(1, 1, 2),
      row(2, 1, 3),
      row(3, 1, 2), // no pasa
      row(3, 2, 3), // pasa al segundo intento
      row(4, 1, 1), // no pasa
      row(4, 2, 1), // no pasa
      row(4, 3, 1), // no pasa: se agotan los intentos
    ]);

    expect(summary).toMatchObject({
      levelsReported: 7,
      maxLevel: 4,
      maxLevelPassed: 3,
      maxSequenceLengthPassed: 4,
      maxLevelPassedFirstTry: 2,
      levelsPassed: 3,
      failedTries: 4,
    });
  });

  it("seriacion: si el resultado no trae passed se calcula con los umbrales", () => {
    const summary = summarizeResults("color-sequence", [
      { index: 1, tryNumber: 1, metrics: { sequenceLength: 2, correctCount: 2 }, activeMsGross: 1, activeMsNet: 1 },
      { index: 2, tryNumber: 1, metrics: { sequenceLength: 3, correctCount: 1 }, activeMsGross: 1, activeMsNet: 1 },
    ]);

    expect(summary).toMatchObject({ maxLevelPassed: 1, failedTries: 1 });
  });

  it("seriacion: nivel maximo y aciertos", () => {
    const summary = summarizeResults("color-sequence", [
      { index: 1, tryNumber: 1, metrics: { sequenceLength: 3, correctCount: 3 }, activeMsGross: 1000, activeMsNet: 900 },
      { index: 2, tryNumber: 1, metrics: { sequenceLength: 4, correctCount: 2 }, activeMsGross: 2000, activeMsNet: 1500 },
    ]);

    expect(summary).toMatchObject({
      levelsReported: 2,
      maxLevel: 2,
      totalCorrect: 5,
      totalItems: 7,
      activeMsGross: 3000,
      activeMsNet: 2400,
    });
  });

  it("nodos: deshacer y reiniciar", () => {
    const summary = summarizeResults("node-connection", [
      { index: 1, tryNumber: 1, metrics: { undoCount: 2, resetCount: 1 }, activeMsGross: 1, activeMsNet: 1 },
      { index: 2, tryNumber: 1, metrics: { undoCount: 3, resetCount: 0 }, activeMsGross: 1, activeMsNet: 1 },
    ]);

    expect(summary).toMatchObject({ maxLevel: 2, totalUndo: 5, totalReset: 1 });
  });

  it("mini casos: pasos correctos y casos perfectos", () => {
    const summary = summarizeResults("mini-cases", [
      { index: 1, tryNumber: 1, metrics: { correctSteps: 4, isFullyCorrect: true }, activeMsGross: 1, activeMsNet: 1 },
      { index: 2, tryNumber: 1, metrics: { correctSteps: 2, isFullyCorrect: false }, activeMsGross: 1, activeMsNet: 1 },
    ]);

    expect(summary).toMatchObject({ totalCorrectSteps: 6, fullyCorrectCases: 1 });
  });

  it("sin resultados no inventa nada", () => {
    expect(summarizeResults("color-sequence", [])).toMatchObject({
      levelsReported: 0,
      maxLevel: 0,
      activeMsGross: 0,
    });
  });
});
