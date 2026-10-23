import { describe, expect, it } from "vitest";

import { buildChart } from "./charts";
import { parseChartRequest } from "./request";
import { formatDateRange, isDateKey, rangeWindow } from "./time";
import type { AttemptRow, ChartResult, ResultRow, StatsData } from "./types";

const NOW = new Date("2026-12-01T15:00:00Z");

let counter = 0;

function attempt(rut: string, number: number, startedAt: string): AttemptRow {
  counter += 1;

  return {
    attemptId: `att-${rut}-${number}-${counter}`,
    studentRut: rut,
    gameId: "color-sequence",
    attemptNumber: number,
    status: "finished",
    startedAt: new Date(startedAt),
    lastActivityAt: new Date(startedAt),
    contentVersion: "color-sequence-2",
    student: null,
  };
}

/** Un nivel superado por cada nivel que se pide: la partida llega hasta `top`. */
function levels(owner: AttemptRow, top: number): ResultRow[] {
  return Array.from({ length: top }, (_, i) => ({
    attemptId: owner.attemptId,
    studentRut: owner.studentRut,
    gameId: owner.gameId,
    key: `${i + 1}.1`,
    index: i + 1,
    tryNumber: 1,
    metrics: { sequenceLength: i + 2, correctCount: i + 2, passed: true },
    activeMsNet: 10_000,
    completedAt: owner.startedAt,
  }));
}

/**
 * A: partida 1 el 5 oct (nivel 2) y partida 2 el 10 nov (nivel 3).
 * B: partida 1 el 20 oct (nivel 1) y partida 2 el 12 nov (nivel 1).
 * C: solo la partida 1, el 15 nov (nivel 3).
 */
function data(): StatsData {
  const a1 = attempt("1", 1, "2026-10-05T15:00:00Z");
  const a2 = attempt("1", 2, "2026-11-10T15:00:00Z");
  const b1 = attempt("2", 1, "2026-10-20T15:00:00Z");
  const b2 = attempt("2", 2, "2026-11-12T15:00:00Z");
  const c1 = attempt("3", 1, "2026-11-15T15:00:00Z");

  return {
    students: ["1", "2", "3"].map((rut) => ({
      rut,
      firstName: `N${rut}`,
      paternalLastName: `A${rut}`,
      paralelo: 1,
      enabled: true,
    })),
    attempts: [a1, a2, b1, b2, c1],
    results: [...levels(a1, 2), ...levels(a2, 3), ...levels(b1, 1), ...levels(b2, 1), ...levels(c1, 3)],
    caseTitles: {},
  };
}

function run(query: Record<string, unknown>, source: StatsData = data()): ChartResult {
  const parsed = parseChartRequest({ chart: "cs-max-level", ...query });

  if (!parsed.ok) throw new Error(parsed.message);

  return buildChart(parsed.def, parsed.request, source, NOW);
}

const OCT = '{"from":"2026-10-01","to":"2026-10-31"}';
const NOV = '{"from":"2026-11-01","to":"2026-11-30"}';

describe("fechas", () => {
  it("isDateKey acepta solo fechas que existen", () => {
    expect(isDateKey("2026-10-31")).toBe(true);
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(isDateKey("2026-13-01")).toBe(false);
    expect(isDateKey("26-10-01")).toBe(false);
    expect(isDateKey(20261001)).toBe(false);
  });

  it("el rango cuenta dias completos en hora de Chile: incluye el ultimo dia entero", () => {
    const { from, until } = rangeWindow({ from: "2026-10-01", to: "2026-10-31" });

    // Octubre es horario de verano (UTC-3): la medianoche de Chile es 03:00 UTC.
    expect(from.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(until.toISOString()).toBe("2026-11-01T03:00:00.000Z");
  });

  it("en invierno el desfase es de 4 horas", () => {
    const { from, until } = rangeWindow({ from: "2026-07-01", to: "2026-07-01" });

    expect(from.toISOString()).toBe("2026-07-01T04:00:00.000Z");
    expect(until.toISOString()).toBe("2026-07-02T04:00:00.000Z");
  });

  it("formatDateRange", () => {
    expect(formatDateRange({ from: "2026-10-01", to: "2026-10-31" })).toBe("1 oct 2026 – 31 oct 2026");
    expect(formatDateRange({ from: "2026-10-05", to: "2026-10-05" })).toBe("5 oct 2026");
  });
});

describe("rango de fechas como período", () => {
  it("solo cuenta las partidas iniciadas dentro del rango", () => {
    const chart = run({ partida: "", range: OCT });

    // En octubre juegan A (nivel 2) y B (nivel 1): nadie llego al 0 ni al 3.
    expect(chart.series[0]?.n).toBe(2);
    expect(chart.notes.join(" ")).toMatch(/Período: del 1 oct 2026 – 31 oct 2026/);
  });

  it("el ultimo dia entra completo y el siguiente no", () => {
    const edge = data();

    // 31 oct 23:30 en Chile (02:30 UTC del 1 nov) entra; 1 nov 00:30 en Chile no.
    edge.attempts = [
      attempt("1", 1, "2026-11-01T02:30:00Z"),
      attempt("2", 1, "2026-11-01T03:30:00Z"),
    ];
    edge.results = [...levels(edge.attempts[0] as AttemptRow, 1), ...levels(edge.attempts[1] as AttemptRow, 1)];

    expect(run({ partida: "", range: OCT }, edge).series[0]?.n).toBe(1);
  });
});

describe("partida número N", () => {
  it("la partida 2 de noviembre la juegan A y B, no C", () => {
    const chart = run({ partida: "2", range: NOV });

    expect(chart.series[0]?.n).toBe(2);
    expect(chart.notes.join(" ")).toMatch(/partida número 2 del período elegido/);
  });

  it("la partida 2 dentro de octubre no existe para nadie", () => {
    expect(run({ partida: "2", range: OCT }).series[0]?.n).toBe(0);
  });

  it("la partida 12 sin que nadie la haya jugado deja el gráfico en cero, sin error", () => {
    expect(run({ partida: "12" }).series[0]?.n).toBe(0);
  });
});

describe("comparar por rangos de fechas", () => {
  const TWO = `[${OCT},${NOV}]`;

  it("un grupo por rango, con su etiqueta, en el orden pedido", () => {
    const chart = run({ partida: "", groupBy: "dateRange", ranges: TWO });

    expect(chart.series.map((s) => s.label)).toEqual(["1 oct 2026 – 31 oct 2026", "1 nov 2026 – 30 nov 2026"]);
    expect(chart.series.map((s) => s.slot)).toEqual([0, 1]);
    expect(chart.notes.join(" ")).toMatch(/Cada grupo es un rango de fechas/);
  });

  it("sin número de partida, quien jugó en los dos rangos cuenta en cada uno", () => {
    const chart = run({ partida: "", groupBy: "dateRange", ranges: TWO });

    // Octubre: A y B. Noviembre: A, B y C.
    expect(chart.series.map((s) => s.n)).toEqual([2, 3]);
    expect(chart.studentsTotal).toBe(3);
  });

  it("con partida 2, cada rango muestra la partida 2 de quienes la jugaron ahí", () => {
    const chart = run({ partida: "2", groupBy: "dateRange", ranges: TWO });

    expect(chart.series.map((s) => s.n)).toEqual([0, 2]);
    expect(chart.notes.join(" ")).toMatch(/partida número 2 de cada rango/);
  });

  it("con partida 1, A y B la juegan en octubre y C en noviembre", () => {
    const chart = run({ partida: "1", groupBy: "dateRange", ranges: TWO });

    expect(chart.series.map((s) => s.n)).toEqual([2, 1]);
  });

  it("los valores de cada rango son los de sus propias partidas (nivel máximo)", () => {
    // Con partida "" y estudiantes juntos: en octubre A llega al 2 y B al 1; en noviembre A al 3, B al 1 y C al 3.
    const chart = run({ partida: "", groupBy: "dateRange", ranges: TWO, options: '{"as":"count"}' });
    const [oct, nov] = chart.series;

    expect(chart.categories).toEqual(["0", "1", "2", "3"]);
    expect(oct?.values).toEqual([0, 1, 1, 0]);
    expect(nov?.values).toEqual([0, 1, 0, 2]);
  });

  it("rangos que se cruzan: la partida aparece en cada uno", () => {
    const overlap = `[{"from":"2026-10-01","to":"2026-11-30"},${NOV}]`;
    const chart = run({ partida: "", groupBy: "dateRange", ranges: overlap });

    expect(chart.series.map((s) => s.n)).toEqual([3, 3]);
  });

  it("funciona también en los gráficos generales que cuentan partidas", () => {
    const chart = run({ chart: "gen-outcomes", groupBy: "dateRange", ranges: TWO });

    expect(chart.series.map((s) => s.n)).toEqual([2, 3]);
  });

  it("se puede combinar con un filtro", () => {
    const chart = run({
      partida: "",
      groupBy: "dateRange",
      ranges: TWO,
      filters: '{"paralelo":["2"]}',
    });

    expect(chart.series.map((s) => s.n)).toEqual([0, 0]);
  });
});
