import { describe, expect, it } from "vitest";

import { buildChart, CHARTS } from "./charts";
import { deductionOf } from "./deductions";
import { parseChartRequest } from "./request";
import type { AttemptRow, ChartResult, ResultRow, StatsData, StudentRow } from "./types";

const NOW = new Date("2026-10-21T15:00:00Z");

let counter = 0;

const student = (rut: string): StudentRow => ({
  rut,
  firstName: `Nombre${rut}`,
  paternalLastName: `Apellido${rut}`,
  paralelo: 1,
  enabled: true,
});

function attempt(rut: string, attemptNumber = 1): AttemptRow {
  counter += 1;

  return {
    attemptId: `nc-${rut}-${attemptNumber}-${counter}`,
    studentRut: rut,
    gameId: "node-connection",
    attemptNumber,
    status: "finished",
    startedAt: new Date("2026-10-10T12:00:00Z"),
    lastActivityAt: new Date("2026-10-10T13:00:00Z"),
    contentVersion: "nodes-15-x-r3",
    student: null,
  };
}

/** Un intento de un nivel con los errores indicados (choques y rehacer tablero). */
function tryOf(
  owner: AttemptRow,
  level: number,
  tryNumber: number,
  seconds: number,
  opts: {
    passed: boolean;
    blocked?: number;
    reset?: number;
    undo?: number;
    pairs?: number;
    extra?: Record<string, unknown>;
  },
): ResultRow {
  const pairs = opts.pairs ?? 3;
  const blocked = opts.blocked ?? 0;
  const reset = opts.reset ?? 0;
  const per = level <= 5 ? 3 : level <= 10 ? 2 : 1;

  return {
    attemptId: owner.attemptId,
    studentRut: owner.studentRut,
    gameId: "node-connection",
    key: tryNumber === 1 ? String(level) : `${level}.${tryNumber}`,
    index: level,
    tryNumber,
    metrics: {
      solved: opts.passed,
      passed: opts.passed,
      pairCount: pairs,
      blockedCount: blocked,
      resetCount: reset,
      undoCount: opts.undo ?? 0,
      errors: blocked + 2 * reset,
      errorsAllowed: pairs * per,
      ...opts.extra,
    },
    activeMsNet: seconds * 1000,
    completedAt: new Date("2026-10-10T12:30:00Z"),
  };
}

function run(data: StatsData, query: Record<string, unknown>): ChartResult {
  const parsed = parseChartRequest({ partida: "1", ...query });

  if (!parsed.ok) throw new Error(parsed.message);

  return buildChart(parsed.def, parsed.request, data, NOW);
}

const all = (chart: ChartResult) => {
  const found = chart.series.find((s) => s.key === "all");

  if (!found) throw new Error("sin serie");

  return found;
};

/**
 * A: nivel 1 al primer intento; nivel 2 perdido una vez y superado al 2.º; nivel 3 perdido 3 veces.
 * B: nivel 1 y 2 al primer intento, nivel 3 al primer intento.
 * C: resultados antiguos, sin `passed` (se juegan antes de existir los errores permitidos).
 */
function data(): StatsData {
  const a = attempt("A");
  const b = attempt("B");
  const c = attempt("C");

  const legacy = (level: number, seconds: number): ResultRow => ({
    attemptId: c.attemptId,
    studentRut: "C",
    gameId: "node-connection",
    key: String(level),
    index: level,
    tryNumber: 1,
    metrics: { pairCount: 2, undoCount: 1, resetCount: 0 },
    activeMsNet: seconds * 1000,
    completedAt: new Date("2026-10-10T12:30:00Z"),
  });

  return {
    students: [student("A"), student("B"), student("C")],
    attempts: [a, b, c],
    results: [
      tryOf(a, 1, 1, 10, { passed: true, blocked: 1, undo: 2 }),
      tryOf(a, 2, 1, 6, { passed: false, blocked: 10, reset: 0, undo: 1 }),
      tryOf(a, 2, 2, 20, { passed: true, blocked: 2, undo: 0 }),
      tryOf(a, 3, 1, 5, { passed: false, blocked: 10 }),
      tryOf(a, 3, 2, 5, { passed: false, blocked: 10 }),
      tryOf(a, 3, 3, 5, { passed: false, blocked: 10 }),
      tryOf(b, 1, 1, 14, { passed: true, blocked: 0, undo: 0 }),
      tryOf(b, 2, 1, 22, { passed: true, blocked: 3, reset: 1, undo: 4 }),
      tryOf(b, 3, 1, 30, { passed: true, blocked: 4, undo: 2 }),
      legacy(1, 12),
      legacy(2, 18),
    ],
    caseTitles: {},
  };
}

describe("Nodos: niveles y aprobación", () => {
  it("nivel máximo superado cuenta solo intentos superados; un resultado antiguo cuenta como superado", () => {
    const chart = run(data(), { chart: "nc-levels" });

    // A superó hasta el 2, B hasta el 3, C hasta el 2 (resultados antiguos).
    expect(chart.categories).toEqual(["0", "1", "2", "3"]);
    expect(all(chart).values).toEqual([0, 0, 2, 1]);
  });

  it("estudiantes que superaron cada nivel: la curva solo baja", () => {
    const chart = run(data(), { chart: "nc-reach" });

    expect(chart.categories).toEqual(["1", "2", "3"]);
    expect(all(chart).values).toEqual([3, 3, 1]);
  });

  it("aprobación: primer intento frente a cualquiera de los 3", () => {
    const first = run(data(), { chart: "nc-pass-rate" });
    const any = run(data(), { chart: "nc-pass-rate", options: '{"measure":"anyTry"}' });

    // Nivel 2: A perdió el primer intento, B y C lo pasaron. Nivel 3: A y B lo jugaron; solo B lo pasó.
    expect(all(first).values).toEqual([100, 66.7, 50]);
    expect(all(any).values).toEqual([100, 100, 50]);
    expect(all(first).ns).toEqual([3, 3, 2]);
  });

  it("intentos para superar un nivel", () => {
    const chart = run(data(), { chart: "nc-tries", options: '{"as":"count"}' });

    expect(chart.categories).toEqual(["A la primera", "Al 2.º intento", "Al 3.er intento", "No lo superó"]);
    // Primera: A1, B1, B2, B3, C1, C2 = 6; 2.º: A2; 3.º: 0; no lo superó: A3.
    expect(all(chart).values).toEqual([6, 1, 0, 1]);
  });

  it("intentos acotados a los niveles 1 a 5", () => {
    const chart = run(data(), { chart: "nc-tries", options: '{"as":"count","levels":"6-10"}' });

    expect(all(chart).values).toEqual([0, 0, 0, 0]);
  });
});

describe("Nodos: tiempo por nivel", () => {
  it("mide el primer intento solo si se superó", () => {
    const chart = run(data(), { chart: "nc-time" });

    // Nivel 1: 10, 14, 12 -> 12. Nivel 2: B 22 y C 18 (el primer intento de A se perdió) -> 20.
    // Nivel 3: solo B (el primer intento de A se perdió) -> 30.
    expect(all(chart).values).toEqual([12, 20, 30]);
    expect(all(chart).ns).toEqual([3, 2, 1]);
  });
});

describe("Nodos: errores", () => {
  it("errores por nivel: mediana del primer intento, incluso si se perdió", () => {
    const chart = run(data(), { chart: "nc-errors" });

    expect(chart.unit).toBe("count");
    // Nivel 1: A 1, B 0 (C sin contadores, no entra) -> 0,5. Nivel 2: A 10, B 3 + 2 = 5 -> 7,5. Nivel 3: A 10, B 4 -> 7.
    expect(all(chart).values).toEqual([0.5, 7.5, 7]);
    expect(all(chart).ns).toEqual([2, 2, 2]);
  });

  it("choques por nivel", () => {
    const chart = run(data(), { chart: "nc-errors", options: '{"measure":"blocked"}' });

    expect(all(chart).values).toEqual([0.5, 6.5, 7]);
  });

  it("margen usado: errores sobre los permitidos, un intento perdido pasa del 100 %", () => {
    const chart = run(data(), { chart: "nc-errors", options: '{"measure":"margin"}' });

    expect(chart.unit).toBe("percent");
    // Permitidos en los niveles 1 a 5: 3 pares x 3 = 9. Nivel 1: A 1/9, B 0 -> 5,6 %.
    // Nivel 2: A 10/9 (111 %, intento perdido), B 5/9 (55,6 %) -> 83,3 %.
    expect(all(chart).values[0]).toBeCloseTo(5.6, 1);
    expect(all(chart).values[1]).toBeCloseTo(83.3, 1);
  });
});

describe("Nodos: correcciones y ritmo", () => {
  it("Deshacer por nivel", () => {
    const chart = run(data(), { chart: "nc-corrections" });

    // Nivel 1: A 2, B 0, C 1 -> 1. Nivel 2: A 1, B 4, C 1 -> 1. Nivel 3: A 0, B 2 -> 1.
    expect(all(chart).values).toEqual([1, 1, 1]);
  });

  it("rehacer tablero por nivel", () => {
    const chart = run(data(), { chart: "nc-corrections", options: '{"measure":"reset"}' });

    expect(all(chart).values).toEqual([0, 0, 0]);
  });

  it("cómo corrigen: solo suma niveles con los cuatro contadores", () => {
    const withDetail = data();

    withDetail.results = withDetail.results.map((r) =>
      r.studentRut === "B" && r.index === 2
        ? { ...r, metrics: { ...r.metrics, routeRestarts: 2, backtrackGestures: 3 } }
        : r,
    );

    const chart = run(withDetail, { chart: "nc-correction-mix", options: '{"as":"count"}' });

    expect(chart.categories).toEqual(["Deshacer", "Rehacer tablero", "Rehacer una ruta", "Retroceder sobre el trazo"]);
    // Solo el nivel 2 de B trae los cuatro: Deshacer 4, Rehacer tablero 1, ruta 2, retroceso 3.
    expect(all(chart).values).toEqual([4, 1, 2, 3]);
  });

  it("tiempo hasta el primer trazo, en segundos", () => {
    const withEvents = data();

    withEvents.results = withEvents.results.map((r) =>
      r.studentRut === "B" ? { ...r, metrics: { ...r.metrics, firstStrokeMs: 4000 + r.index * 1000 } } : r,
    );

    const chart = run(withEvents, { chart: "nc-pace" });

    expect(chart.unit).toBe("seconds");
    expect(all(chart).values).toEqual([5, 6, 7]);
    expect(all(chart).ns).toEqual([1, 1, 1]);
  });
});

describe("Nodos: mejora entre partidas", () => {
  it("nivel máximo superado por número de partida", () => {
    const first = attempt("A", 1);
    const second = attempt("A", 2);
    const two: StatsData = {
      students: [student("A")],
      attempts: [first, second],
      results: [
        tryOf(first, 1, 1, 10, { passed: true }),
        tryOf(first, 2, 1, 10, { passed: false, blocked: 20 }),
        tryOf(second, 1, 1, 10, { passed: true }),
        tryOf(second, 2, 1, 10, { passed: true }),
        tryOf(second, 3, 1, 10, { passed: true }),
      ],
      caseTitles: {},
    };

    const curve = run(two, { chart: "nc-improvement", partida: "" });

    expect(all(curve).values).toEqual([1, 3]);

    const change = run(two, { chart: "nc-improvement", partida: "", options: '{"measure":"change","as":"count"}' });

    expect(change.categories).toEqual(["Mejoró", "Quedó igual", "Empeoró"]);
    expect(all(change).values).toEqual([1, 0, 0]);
  });
});

describe("catálogo de Conexión de nodos", () => {
  const nodeCharts = CHARTS.filter((chart) => chart.game === "node-connection");

  it("tiene los gráficos esperados", () => {
    expect(nodeCharts.map((chart) => chart.id)).toEqual([
      "nc-levels",
      "nc-pass-rate",
      "nc-time",
      "nc-reach",
      "nc-tries",
      "nc-errors",
      "nc-corrections",
      "nc-correction-mix",
      "nc-pace",
      "nc-improvement",
    ]);
  });

  it.each(nodeCharts.map((chart) => chart.id))("%s: opciones válidas, leyenda y funciona sin datos", (id) => {
    const def = nodeCharts.find((chart) => chart.id === id);

    expect(def?.blurb.length).toBeGreaterThan(60);
    expect(deductionOf(id as never, false)?.length).toBeGreaterThan(40);

    for (const option of def?.options ?? []) {
      expect(option.choices.map((c) => c.value)).toContain(option.default);

      // Cada opción se puede pedir y no rompe con datos mínimos.
      for (const choice of option.choices) {
        const chart = run(data(), { chart: id, options: JSON.stringify({ [option.id]: choice.value }) });

        expect(chart.chart).toBe(id);
      }
    }

    expect(run({ students: [], attempts: [], results: [], caseTitles: {} }, { chart: id }).studentsTotal).toBe(0);
  });
});
