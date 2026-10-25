import { describe, expect, it } from "vitest";

import { buildChart } from "./charts";
import { parseChartRequest } from "./request";
import { rankStudents, topScoreRows, TOP_SCORE_COLUMNS } from "./topScores";
import type { AttemptRow, ChartResult, GameId, ResultRow, StatsData, StudentRow } from "./types";

const NOW = new Date("2026-10-21T15:00:00Z");

let counter = 0;

const student = (rut: string, extra: Partial<StudentRow> = {}): StudentRow => ({
  rut,
  firstName: `Nombre${rut}`,
  paternalLastName: `Apellido${rut}`,
  paralelo: 1,
  enabled: true,
  university: "uvm",
  studyShift: "diurno",
  birthDate: "2000-10-22",
  ...extra,
});

function attempt(rut: string, gameId: GameId): AttemptRow {
  counter += 1;

  return {
    attemptId: `att-${counter}`,
    studentRut: rut,
    gameId,
    attemptNumber: 1,
    status: "finished",
    startedAt: new Date("2026-10-10T15:00:00Z"),
    lastActivityAt: new Date("2026-10-10T16:00:00Z"),
    contentVersion: "x",
    student: null,
  } as AttemptRow;
}

/** Niveles de seriacion 1..n superados al primer intento (10 puntos + 5 por el primer intento cada uno). */
function passedLevels(owner: AttemptRow, n: number): ResultRow[] {
  return Array.from({ length: n }, (_, i) => ({
    attemptId: owner.attemptId,
    studentRut: owner.studentRut,
    gameId: owner.gameId,
    key: `${i + 1}`,
    index: i + 1,
    tryNumber: 1,
    metrics: { sequenceLength: i + 2, correctCount: i + 1, passed: true },
    activeMsNet: 10_000,
    completedAt: new Date("2026-10-10T15:30:00Z"),
  }));
}

function world() {
  const a = attempt("1", "color-sequence");
  const b = attempt("2", "color-sequence");
  const c = attempt("3", "color-sequence");

  return {
    students: [student("1"), student("2", { university: "santo-tomas", paralelo: 2 }), student("3"), student("4")],
    attempts: [a, b, c],
    results: [...passedLevels(a, 3), ...passedLevels(b, 5), ...passedLevels(c, 3)],
    caseKeys: [],
  };
}

describe("rankStudents", () => {
  it("ordena de mayor a menor puntaje y deja fuera a quien no sumó nada", () => {
    const ranked = rankStudents(world());

    expect(ranked.map((item) => item.student.rut)).toEqual(["2", "1", "3"]);
    expect(ranked[0]!.scores.totalPoints).toBeGreaterThan(ranked[1]!.scores.totalPoints);
  });

  it("a igual puntaje decide el orden alfabético y comparten puesto", () => {
    const ranked = rankStudents(world());
    const rows = topScoreRows(ranked, NOW);

    expect(rows.map((row) => row[0])).toEqual([1, 2, 2]);
    expect(rows.map((row) => row[2])).toEqual(["2", "1", "3"]);
  });

  it("no cuenta dos veces una partida que llega copiada", () => {
    const base = world();
    const once = rankStudents(base)[0]!.scores.totalPoints;
    const twice = rankStudents({ ...base, attempts: [...base.attempts, ...base.attempts] })[0]!.scores.totalPoints;

    expect(twice).toBe(once);
  });
});

describe("topScoreRows", () => {
  it("trae universidad, paralelo, jornada, nombre, RUT y edad, en el orden de las columnas", () => {
    const row = topScoreRows(rankStudents(world()), NOW)[0]!;

    expect(row).toHaveLength(TOP_SCORE_COLUMNS.length);
    expect(row[1]).toContain("Apellido2");
    expect(row[2]).toBe("2");
    expect(row[3]).toMatch(/Santo Tom/);
    expect(row[4]).toBe(2);
    expect(row[6]).toBe(25); // cumple 26 al dia siguiente
    expect(typeof row[7]).toBe("number");
  });
});

describe("tarjeta «Máximo logro»", () => {
  const data = (): StatsData => ({ ...world(), unlocks: [], caseTitles: {} });
  const run = (d: StatsData): ChartResult => {
    const parsed = parseChartRequest({ chart: "gen-summary" });

    if (!parsed.ok) throw new Error(parsed.message);

    return buildChart(parsed.def, parsed.request, d, NOW);
  };

  it("muestra el puntaje más alto y abre el ranking", () => {
    const item = run(data()).cards?.[0]?.items[0];

    expect(item?.label).toBe("Máximo logro");
    expect(item?.value).toMatch(/puntos/);
    expect(item?.hint).toContain("Apellido2");
    expect(item?.lists?.[0]?.title).toBe("Ranking de logros");
    expect(item?.lists?.[0]?.rows.map((row) => row[2])).toEqual(["2", "1", "3"]);
  });

  it("sin nadie con puntos dice «Sin datos» y la lista queda vacía", () => {
    const item = run({ ...data(), attempts: [], results: [] }).cards?.[0]?.items[0];

    expect(item?.value).toBe("Sin datos");
    expect(item?.lists?.[0]?.rows).toEqual([]);
  });
});
