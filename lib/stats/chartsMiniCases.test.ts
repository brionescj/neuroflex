import { describe, expect, it } from "vitest";

import { buildChart } from "./charts";
import { parseChartRequest } from "./request";
import type { AttemptRow, ResultRow, StatsData, StudentRow } from "./types";

const NOW = new Date("2026-10-21T15:00:00Z");

const student = (rut: string): StudentRow => ({
  rut,
  firstName: `Nombre${rut}`,
  paternalLastName: `Apellido${rut}`,
  paralelo: 1,
  enabled: true,
});

let counter = 0;

function attempt(rut: string): AttemptRow {
  counter += 1;

  return {
    attemptId: `mc-${rut}-${counter}`,
    studentRut: rut,
    gameId: "mini-cases",
    attemptNumber: 1,
    status: "finished",
    startedAt: new Date("2026-10-10T12:00:00Z"),
    lastActivityAt: new Date("2026-10-10T13:00:00Z"),
    contentVersion: "mini-cases",
    student: null,
  };
}

const OPTIONS = [
  { optionKey: "a", text: "Mirar a ambos lados", correctStep: 1 },
  { optionKey: "b", text: "Esperar la luz verde", correctStep: 2 },
  { optionKey: "c", text: "Cruzar caminando", correctStep: 3 },
  { optionKey: "d", text: "Saludar al otro lado", correctStep: 4 },
];

/** `order`: las claves tal como las puso el estudiante, del paso 1 al 4. */
function play(owner: AttemptRow, order: string[], withDetail = true): ResultRow {
  const placements = order.map((optionKey, index) => ({
    step: index + 1,
    optionKey,
    expectedStep: (OPTIONS.find((o) => o.optionKey === optionKey)?.correctStep as number),
    displayedAt: null,
  }));

  return {
    attemptId: owner.attemptId,
    studentRut: owner.studentRut,
    gameId: "mini-cases",
    key: "caso-1",
    index: 1,
    tryNumber: 1,
    metrics: withDetail
      ? { correctSteps: placements.filter((p) => p.step === p.expectedStep).length, placements, options: OPTIONS }
      : { correctSteps: 2 },
    activeMsNet: 20_000,
    completedAt: new Date("2026-10-10T12:30:00Z"),
  };
}

function data(): StatsData {
  const a = attempt("A");
  const b = attempt("B");
  const c = attempt("C");
  const d = attempt("D");

  return {
    students: [student("A"), student("B"), student("C"), student("D")],
    attempts: [a, b, c, d],
    results: [
      play(a, ["a", "b", "c", "d"]),
      // B y C ponen «Cruzar» antes de «Esperar la luz verde».
      play(b, ["a", "c", "b", "d"]),
      play(c, ["a", "c", "b", "d"]),
      play(d, ["a", "b", "c", "d"], false),
    ],
    caseTitles: { "caso-1": "Cruzar la calle" },
  };
}

function run(stats: StatsData) {
  const parsed = parseChartRequest({ chart: "mc-options", partida: "" });

  if (!parsed.ok) throw new Error(parsed.message);

  return buildChart(parsed.def, parsed.request, stats, NOW);
}

describe("Mini casos: alternativas que más fallan", () => {
  it("por caso, ordena los pasos del que más se falla al que menos y dice dónde lo ponen", () => {
    const chart = run(data());
    const card = chart.cards?.[0];

    expect(chart.views).toEqual(["cards"]);
    expect(card?.group).toBe("Caso 1 · Cruzar la calle");
    expect(card?.items).toHaveLength(4);

    // «Esperar» (correcto: paso 2) y «Cruzar» (paso 3) las fallan B y C; las otras dos nadie.
    const worst = card?.items[0];

    expect(worst?.label).toBe("Esperar la luz verde");
    expect(worst?.value).toBe("67 % la ubicó mal");
    expect(worst?.hint).toMatch(/Debía ir en el paso 2/);
    expect(worst?.hint).toMatch(/paso 3 \(2 de 2\)/);
    expect(worst?.hint).toMatch(/2 estudiantes la fallaron/);
    expect(card?.items[3]?.value).toBe("Nadie la ubicó mal");
  });

  it("al tocar un paso se ven los estudiantes que lo fallaron, con las veces y dónde lo pusieron", () => {
    const list = run(data()).cards?.[0]?.items[0]?.lists?.[0];

    expect(list?.columns.slice(-3)).toEqual(["Veces que falló", "Veces que la jugó", "Dónde la puso más"]);
    expect(list?.rows.map((row) => row[1])).toEqual(["B", "C"]);
    expect(list?.rows[0]?.slice(-3)).toEqual([1, 1, "Paso 3 (1 de 1)"]);
  });

  it("la tabla junta los casos y las respuestas sin detalle se avisan sin romper", () => {
    const chart = run(data());

    expect(chart.table?.rows).toHaveLength(4);
    expect(chart.table?.rows[0]?.slice(0, 3)).toEqual(["Caso 1 · Cruzar la calle", "Esperar la luz verde", "Paso 2"]);
    expect(chart.notes.join(" ")).toMatch(/1 respuestas antiguas/);
    expect(chart.studentsTotal).toBe(3);
  });

  it("sin datos funciona y no inventa tarjetas", () => {
    const chart = run({ students: [], attempts: [], results: [], caseTitles: {} });

    expect(chart.cards).toEqual([]);
    expect(chart.table?.rows).toEqual([]);
  });
});
