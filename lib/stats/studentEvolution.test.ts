import { describe, expect, it } from "vitest";

import { EVOLUTION_SPANS, buildEvolution, parseEvolutionQuery } from "./studentEvolution";
import type { AttemptRow, GameId, ResultRow } from "./types";

// Miercoles 21 de octubre de 2026, 12:00 en Chile.
const NOW = new Date("2026-10-21T15:00:00Z");
const RUT = "11111111";

let counter = 0;

function attempt(gameId: GameId, startedAt: string, status: AttemptRow["status"] = "finished"): AttemptRow {
  counter += 1;

  return {
    attemptId: `att-${counter}`,
    studentRut: RUT,
    gameId,
    attemptNumber: counter,
    status,
    startedAt: new Date(startedAt),
    lastActivityAt: new Date(startedAt),
    contentVersion: "x",
    student: null,
  };
}

function level(owner: AttemptRow, n: number, seconds: number, metrics: Record<string, unknown> = {}): ResultRow {
  return {
    attemptId: owner.attemptId,
    studentRut: RUT,
    gameId: owner.gameId,
    key: `${n}.1`,
    index: n,
    tryNumber: 1,
    metrics: { sequenceLength: n + 1, correctCount: n + 1, passed: true, ...metrics },
    activeMsNet: seconds * 1000,
    completedAt: new Date(owner.startedAt),
  };
}

/**
 * Seriacion: una partida el martes 6 oct (niveles 1 a 3, 10 s), y dos en la semana del 12 oct:
 * una fallida (niveles 1 a 5, 20 s) y una sin terminar (niveles 1 y 2, 30 s). Sin partidas en las demas semanas.
 */
function fixture() {
  const a1 = attempt("color-sequence", "2026-10-06T15:00:00Z");
  const a2 = attempt("color-sequence", "2026-10-13T15:00:00Z", "failed");
  const a3 = attempt("color-sequence", "2026-10-14T15:00:00Z", "in_progress");
  const m1 = attempt("mini-cases", "2026-09-10T15:00:00Z");

  return {
    attempts: [a1, a2, a3, m1],
    results: [
      ...[1, 2, 3].map((n) => level(a1, n, 10)),
      ...[1, 2, 3, 4, 5].map((n) => level(a2, n, 20)),
      ...[1, 2].map((n) => level(a3, n, 30)),
      level(m1, 1, 40, { correctSteps: 4 }),
      level(m1, 2, 60, { correctSteps: 2 }),
    ],
  };
}

const chartOf = (evolution: ReturnType<typeof buildEvolution>, game: GameId, id: string) =>
  evolution.games.find((g) => g.game === game)?.charts.find((c) => c.id === id)?.result;

describe("parseEvolutionQuery", () => {
  it("acepta cada lectura ofrecida", () => {
    for (const by of ["week", "month"] as const) {
      for (const span of EVOLUTION_SPANS[by]) expect(parseEvolutionQuery({ by, span })).toEqual({ ok: true, by, span });
    }
  });

  it("por semana: 1, 2, 3, 6 meses o todo; por mes: 3, 6, 9, 12 meses o todo", () => {
    expect(EVOLUTION_SPANS.week).toEqual(["1", "2", "3", "6", "all"]);
    expect(EVOLUTION_SPANS.month).toEqual(["3", "6", "9", "12", "all"]);
  });

  it("rechaza lo que no existe, como 9 meses por semana", () => {
    expect(parseEvolutionQuery({ by: "week", span: "9" }).ok).toBe(false);
    expect(parseEvolutionQuery({ by: "month", span: "1" }).ok).toBe(false);
    expect(parseEvolutionQuery({ by: "day", span: "1" }).ok).toBe(false);
    expect(parseEvolutionQuery({}).ok).toBe(false);
  });
});

describe("buildEvolution por semana", () => {
  const { attempts, results } = fixture();
  const evolution = buildEvolution(RUT, attempts, results, "week", "1", NOW);

  it("el último mes son las semanas (lunes a domingo) desde hace un mes hasta la actual", () => {
    // Hoy es miercoles 21 oct; hace un mes, lunes 21 sep: semanas 21 sep, 28 sep, 5, 12 y 19 oct.
    expect(chartOf(evolution, "color-sequence", "ev-count")?.categories).toEqual([
      "21 sep",
      "28 sep",
      "5 oct",
      "12 oct",
      "19 oct",
    ]);
  });

  it("cuenta todas las partidas del período, sea cual sea cómo terminaron", () => {
    expect(chartOf(evolution, "color-sequence", "ev-count")?.series[0]?.values).toEqual([0, 0, 1, 2, 0]);
  });

  it("el nivel es el promedio del mejor nivel de cada partida de la semana", () => {
    // Semana del 5: nivel 3. Semana del 12: partidas con 5 y 2 -> 3,5. Las demás sin dato (no son cero).
    expect(chartOf(evolution, "color-sequence", "ev-level")?.series[0]?.values).toEqual([null, null, 3, 3.5, null]);
  });

  it("el tiempo es el promedio del tiempo de cada partida de la semana", () => {
    // Semana del 5: 10 s. Semana del 12: partidas de 20 s y 30 s -> 25 s.
    expect(chartOf(evolution, "color-sequence", "ev-time")?.series[0]?.values).toEqual([null, null, 10, 25, null]);
  });

  it("una partida del domingo de noche cae en la semana que termina ese domingo", () => {
    const late = attempt("color-sequence", "2026-10-26T02:30:00Z"); // domingo 25 oct, 23:30 en Chile
    const result = buildEvolution(RUT, [late], [level(late, 1, 5)], "week", "1", new Date("2026-10-28T15:00:00Z"));

    expect(chartOf(result, "color-sequence", "ev-count")?.series[0]?.values.at(-2)).toBe(1);
    expect(chartOf(result, "color-sequence", "ev-count")?.series[0]?.values.at(-1)).toBe(0);
  });

  it("los juegos con partidas fuera del período no traen gráficos", () => {
    // Mini casos: su única partida es del 10 sep, antes de «último mes».
    expect(evolution.games.find((g) => g.game === "mini-cases")).toMatchObject({ played: true, partidas: 0, charts: [] });
    expect(evolution.games.find((g) => g.game === "node-connection")).toMatchObject({ played: false, charts: [] });
  });

  it("dice con cuántas partidas y las explica como promedio", () => {
    const chart = chartOf(evolution, "color-sequence", "ev-level");

    expect(chart?.basis).toBe("3 partidas de Seriación de colores, agrupadas por semana.");
    expect(chart?.notes.join(" ")).toMatch(/promedio de esas partidas/);
    expect(chart?.notes.join(" ")).toMatch(/lunes a domingo/);
    expect(chart?.deduction?.length).toBeGreaterThan(30);
    expect(evolution.label).toBe("Promedios por semana · último mes");
  });

  it("«todo el tiempo» parte en la semana de la primera partida", () => {
    const all = buildEvolution(RUT, attempts, results, "week", "all", NOW);

    // Primera partida: 10 sep (jueves) -> semana del 7 sep. Hasta la del 19 oct: 7 semanas.
    expect(chartOf(all, "mini-cases", "ev-count")?.categories[0]).toBe("7 sep");
    expect(chartOf(all, "mini-cases", "ev-count")?.categories).toHaveLength(7);
  });

  it("sin partidas no hay nada que dibujar", () => {
    const none = buildEvolution(RUT, [], [], "week", "all", NOW);

    expect(none.games.every((g) => g.charts.length === 0 && !g.played)).toBe(true);
  });
});

describe("advertencia del tiempo por nivel", () => {
  const { attempts, results } = fixture();
  const nodes = attempt("node-connection", "2026-10-14T15:00:00Z");
  const evolution = buildEvolution(RUT, [...attempts, nodes], [...results, level(nodes, 1, 50)], "week", "1", NOW);
  const caution = /Cuidado: al llegar a niveles más altos/;

  it("Seriación la lleva: cada nivel pide recordar más colores", () => {
    const chart = chartOf(evolution, "color-sequence", "ev-time");

    expect(chart?.deduction).toMatch(caution);
    expect(chart?.notes.join(" ")).toMatch(/Los niveles más altos piden más/);
  });

  it("Conexión de nodos no la lleva, ni en la leyenda ni en las notas", () => {
    const chart = chartOf(evolution, "node-connection", "ev-time");

    expect(chart?.deduction).toBeTruthy();
    expect(chart?.deduction).not.toMatch(caution);
    expect(chart?.notes.join(" ")).not.toMatch(/niveles más altos piden más/);
  });

  it("Mini casos, que no tiene niveles, tampoco", () => {
    const chart = chartOf(buildEvolution(RUT, attempts, results, "month", "3", NOW), "mini-cases", "ev-time");

    expect(chart?.deduction).toBeTruthy();
    expect(chart?.deduction).not.toMatch(caution);
    expect(chart?.notes.join(" ")).not.toMatch(/niveles más altos piden más/);
  });
});

describe("buildEvolution por mes", () => {
  const { attempts, results } = fixture();

  it("los últimos 3 meses son meses calendario: el actual (en curso) y los dos anteriores", () => {
    const evolution = buildEvolution(RUT, attempts, results, "month", "3", NOW);

    expect(chartOf(evolution, "color-sequence", "ev-count")?.categories).toEqual(["ago 2026", "sep 2026", "oct 2026"]);
    expect(chartOf(evolution, "color-sequence", "ev-count")?.series[0]?.values).toEqual([0, 0, 3]);
    expect(evolution.label).toBe("Promedios por mes · últimos 3 meses");
  });

  it("promedia todas las partidas del mes", () => {
    const evolution = buildEvolution(RUT, attempts, results, "month", "3", NOW);

    // Octubre: niveles 3, 5 y 2 -> 3,3. Tiempos 10, 20 y 30 -> 20.
    expect(chartOf(evolution, "color-sequence", "ev-level")?.series[0]?.values).toEqual([null, null, 3.3]);
    expect(chartOf(evolution, "color-sequence", "ev-time")?.series[0]?.values).toEqual([null, null, 20]);
  });

  it("Mini casos promedia los pasos correctos y el tiempo de decisión de cada partida", () => {
    const evolution = buildEvolution(RUT, attempts, results, "month", "3", NOW);

    expect(chartOf(evolution, "mini-cases", "ev-steps")?.series[0]?.values).toEqual([null, 3, null]);
    expect(chartOf(evolution, "mini-cases", "ev-time")?.series[0]?.values).toEqual([null, 50, null]);
    expect(chartOf(evolution, "mini-cases", "ev-steps")?.unit).toBe("steps");
  });

  it("12 meses cruza el año", () => {
    const evolution = buildEvolution(RUT, attempts, results, "month", "12", NOW);
    const categories = chartOf(evolution, "color-sequence", "ev-count")?.categories ?? [];

    expect(categories).toHaveLength(12);
    expect(categories[0]).toBe("nov 2025");
    expect(categories.at(-1)).toBe("oct 2026");
  });
});
