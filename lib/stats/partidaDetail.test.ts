import { describe, expect, it } from "vitest";

import { buildPartidaDetail, type PartidaResult } from "./partidaDetail";
import type { AttemptRow, GameId } from "./types";

const NOW = new Date("2026-10-21T15:00:00Z");

const attempt = (gameId: GameId, extra: Partial<AttemptRow> = {}): AttemptRow => ({
  attemptId: "att-1",
  studentRut: "11111111-1",
  gameId,
  attemptNumber: 3,
  status: "finished",
  startedAt: new Date("2026-10-10T12:00:00Z"),
  lastActivityAt: new Date("2026-10-10T13:00:00Z"),
  contentVersion: "x",
  student: null,
  ...extra,
});

let minute = 0;

function result(gameId: GameId, key: string, index: number, tryNumber: number, ms: number, metrics: Record<string, unknown>, events?: unknown[]): PartidaResult {
  minute += 1;

  return {
    attemptId: "att-1",
    studentRut: "11111111-1",
    gameId,
    key,
    index,
    tryNumber,
    metrics,
    activeMsNet: ms,
    completedAt: new Date(Date.UTC(2026, 9, 10, 12, minute)),
    ...(events ? { events } : {}),
  };
}

describe("detalle de una partida: seriación de colores", () => {
  const level2 = result(
    "color-sequence",
    "2",
    2,
    1,
    12_340,
    { passed: false, sequenceLength: 3, correctCount: 1, shownSequence: ["blue", "red", "green"], firstErrorPosition: 2 },
    [
      { c: "blue", t: 400 },
      { c: "green", t: 900 },
      { c: "red", t: 1500 },
    ],
  );

  it("muestra los colores pedidos frente a los marcados, con los errores señalados y el tiempo del nivel", () => {
    const detail = buildPartidaDetail(attempt("color-sequence"), [level2], {}, NOW);
    const row = detail.rows[0];

    expect(detail).toMatchObject({ game: "color-sequence", attemptNumber: 3, outcome: "Terminada" });
    expect(row).toMatchObject({ label: "Nivel 2", tryText: "Intento 1", result: "No superado", ok: false, seconds: 12.3 });
    expect(row?.lines.map((l) => l.title)).toEqual(["Pidió el sistema", "Marcó el estudiante"]);
    expect(row?.lines[0]?.items.map((i) => i.text)).toEqual(["Azul", "Rojo", "Verde"]);
    expect(row?.lines[1]?.items.map((i) => [i.text, i.ok])).toEqual([
      ["Azul", true],
      ["Verde", false],
      ["Rojo", false],
    ]);
    expect(row?.facts).toContainEqual({ label: "Colores en su lugar", value: "1 de 3" });
    expect(row?.facts).toContainEqual({ label: "Primer error en el color", value: "2" });
    expect(row?.notice).toBeNull();
  });

  it("un nivel antiguo sin colores guardados lo dice, pero conserva el tiempo y los aciertos", () => {
    const old = result("color-sequence", "1", 1, 1, 8_000, { sequenceLength: 2, correctCount: 2 });
    const row = buildPartidaDetail(attempt("color-sequence"), [old], {}, NOW).rows[0];

    expect(row?.lines).toEqual([]);
    expect(row?.notice).toMatch(/no guardó los colores/);
    expect(row?.seconds).toBe(8);
    expect(row?.result).toBe("Superado");
  });

  it("los intentos de un mismo nivel salen en el orden en que se jugaron", () => {
    const detail = buildPartidaDetail(attempt("color-sequence"), [result("color-sequence", "2.2", 2, 2, 5_000, { passed: true }), level2], {}, NOW);

    expect(detail.rows.map((row) => row.tryText)).toEqual(["Intento 1", "Intento 2"]);
  });
});

describe("detalle de una partida: conexión de nodos", () => {
  it("lista los errores del nivel y el orden en que se unieron los colores", () => {
    const nodes = result(
      "node-connection",
      "4",
      4,
      1,
      40_000,
      { passed: true, pairCount: 3, errors: 5, errorsAllowed: 6, blockedCount: 2, undoCount: 1, resetCount: 1, routeRestarts: 0, backtrackGestures: 0 },
      [
        { t: 1, type: "start", color: "red" },
        { t: 2, type: "end", color: "red", done: false },
        { t: 3, type: "end", color: "blue", done: true },
        { t: 4, type: "end", color: "red", done: true },
      ],
    );
    const row = buildPartidaDetail(attempt("node-connection"), [nodes], {}, NOW).rows[0];

    expect(row).toMatchObject({ label: "Nivel 4", result: "Superado", seconds: 40 });
    expect(row?.lines[0]?.title).toBe("Orden en que unió los colores");
    expect(row?.lines[0]?.items.map((i) => i.text)).toEqual(["Azul", "Rojo"]);
    expect(row?.facts).toContainEqual({ label: "Errores", value: "5 de 6 permitidos" });
    expect(row?.facts).toContainEqual({ label: "Choques", value: "2" });
    expect(row?.facts).toContainEqual({ label: "Rehacer tablero", value: "1" });
  });
});

describe("detalle de una partida: mini casos", () => {
  const options = [
    { optionKey: "a", text: "Mirar", correctStep: 1 },
    { optionKey: "b", text: "Esperar", correctStep: 2 },
    { optionKey: "c", text: "Cruzar", correctStep: 3 },
    { optionKey: "d", text: "Seguir", correctStep: 4 },
  ];

  it("muestra el orden correcto frente al elegido, con los pasos fuera de lugar", () => {
    const mc = result("mini-cases", "caso-2", 2, 1, 21_000, {
      correctSteps: 2,
      isFullyCorrect: false,
      options,
      orderedOptionKeys: ["a", "c", "b", "d"],
      positionCorrect: [true, false, false, true],
    });
    const row = buildPartidaDetail(attempt("mini-cases"), [mc], { "caso-2": "Cruzar la calle" }, NOW).rows[0];

    expect(row).toMatchObject({ label: "Mini Caso 2: Cruzar la calle", tryText: null, result: "2 de 4 pasos en su lugar", ok: false });
    expect(row?.lines[0]?.items.map((i) => i.text)).toEqual(["1. Mirar", "2. Esperar", "3. Cruzar", "4. Seguir"]);
    expect(row?.lines[1]?.items.map((i) => [i.text, i.ok])).toEqual([
      ["1. Mirar", true],
      ["2. Cruzar", false],
      ["3. Esperar", false],
      ["4. Seguir", true],
    ]);
  });

  it("un caso con el orden completo lo dice", () => {
    const mc = result("mini-cases", "caso-1", 1, 1, 9_000, {
      correctSteps: 4,
      isFullyCorrect: true,
      options,
      orderedOptionKeys: ["a", "b", "c", "d"],
      positionCorrect: [true, true, true, true],
    });

    expect(buildPartidaDetail(attempt("mini-cases"), [mc], {}, NOW).rows[0]).toMatchObject({ result: "Orden completo", ok: true });
  });

  it("una partida sin resultados no rompe y una sin terminar dice cuándo fue su última actividad", () => {
    const detail = buildPartidaDetail(attempt("mini-cases", { status: "in_progress" }), [], {}, NOW);

    expect(detail.rows).toEqual([]);
    expect(detail.outcome).toMatch(/^Sin terminar/);
  });
});
