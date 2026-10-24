import { describe, expect, it } from "vitest";

import { buildChart } from "./charts";
import { stuckStreak } from "./chartsLists";
import { parseChartRequest } from "./request";
import type { AttemptRow, ChartResult, GameId, ResultRow, StatsData, StudentRow, UnlockRow } from "./types";

// Miercoles 21 de octubre de 2026, 12:00 en Chile.
const NOW = new Date("2026-10-21T15:00:00Z");

let counter = 0;

const student = (rut: string, extra: Partial<StudentRow> = {}): StudentRow => ({
  rut,
  firstName: `Nombre${rut}`,
  paternalLastName: `Apellido${rut}`,
  paralelo: 1,
  enabled: true,
  ...extra,
});

function attempt(rut: string, gameId: GameId, attemptNumber: number, extra: Partial<AttemptRow> = {}): AttemptRow {
  counter += 1;

  return {
    attemptId: `att-${counter}`,
    studentRut: rut,
    gameId,
    attemptNumber,
    status: "finished",
    startedAt: new Date("2026-10-10T15:00:00Z"),
    lastActivityAt: new Date("2026-10-10T16:00:00Z"),
    contentVersion: "x",
    student: null,
    ...extra,
  };
}

function level(owner: AttemptRow, n: number, passed = true): ResultRow {
  return {
    attemptId: owner.attemptId,
    studentRut: owner.studentRut,
    gameId: owner.gameId,
    key: `${n}.1`,
    index: n,
    tryNumber: 1,
    metrics: { sequenceLength: n + 1, correctCount: passed ? n + 1 : 0, passed },
    activeMsNet: 10_000,
    completedAt: new Date("2026-10-10T15:30:00Z"),
  };
}

function run(data: StatsData, query: Record<string, unknown>): ChartResult {
  const parsed = parseChartRequest(query);

  if (!parsed.ok) throw new Error(parsed.message);

  return buildChart(parsed.def, parsed.request, data, NOW);
}

const empty = (students: StudentRow[], attempts: AttemptRow[] = [], results: ResultRow[] = [], unlocks: UnlockRow[] = []): StatsData => ({
  students,
  attempts,
  results,
  unlocks,
  caseTitles: {},
});

describe("Dejaron de jugar", () => {
  const students = [student("1"), student("2"), student("3"), student("4", { enabled: false })];
  const attempts = [
    attempt("1", "color-sequence", 1), // ultima actividad el 10 oct: hace casi 11 dias
    attempt("2", "color-sequence", 1, { lastActivityAt: new Date("2026-10-20T15:00:00Z") }), // ayer
    attempt("4", "color-sequence", 1), // deshabilitado
  ];

  it("por defecto, 3 días: entra quien lleva más de 3 sin jugar y haya jugado", () => {
    const chart = run(empty(students, attempts), { chart: "gen-inactive" });

    expect(chart.views).toEqual([]);
    expect(chart.table?.columns).toEqual([
      "Estudiante",
      "RUT",
      "Paralelo",
      "Universidad",
      "Última actividad",
      "Días sin jugar",
      "Partidas jugadas",
      "Último juego",
    ]);
    expect(chart.table?.rows).toHaveLength(1);
    expect(chart.table?.rows[0]?.slice(0, 2)).toEqual(["Nombre1 Apellido1", "1"]);
    expect(chart.table?.rows[0]?.slice(5)).toEqual([10, 1, "Seriación de colores"]);
    expect(chart.notes.join(" ")).toMatch(/más de 3 días/);
  });

  it("nunca jugó no aparece aquí (está en «sin partidas»), ni quien está deshabilitado", () => {
    const rows = run(empty(students, attempts), { chart: "gen-inactive" }).table?.rows ?? [];

    expect(rows.map((row) => row[1])).toEqual(["1"]);
  });

  it("con 14 días nadie entra, y se ordena de más a menos tiempo", () => {
    expect(run(empty(students, attempts), { chart: "gen-inactive", options: '{"days":"14"}' }).table?.rows).toHaveLength(0);

    const more = [
      ...attempts,
      attempt("3", "color-sequence", 1, { lastActivityAt: new Date("2026-10-01T15:00:00Z") }),
    ];
    const rows = run(empty(students, more), { chart: "gen-inactive" }).table?.rows ?? [];

    expect(rows.map((row) => row[1])).toEqual(["3", "1"]);
  });

  it("por juego solo mira ese juego", () => {
    const chart = run(empty(students, attempts), { chart: "gen-inactive", options: '{"game":"node-connection"}' });

    expect(chart.table?.rows).toHaveLength(0);
  });
});

describe("stuckStreak", () => {
  it("cuenta las últimas partidas seguidas que no superaron el mejor nivel", () => {
    expect(stuckStreak([3, 3, 2, 3, 1, 3])).toEqual({ streak: 5, best: 3 });
    expect(stuckStreak([1, 2, 3, 4])).toEqual({ streak: 0, best: 4 });
    expect(stuckStreak([2, 0, 0])).toEqual({ streak: 2, best: 2 });
    expect(stuckStreak([0, 0, 0])).toEqual({ streak: 3, best: 0 });
    expect(stuckStreak([2, 2, 3])).toEqual({ streak: 0, best: 3 });
    expect(stuckStreak([])).toEqual({ streak: 0, best: 0 });
  });
});

describe("Estudiantes estancados", () => {
  function stuckData(): StatsData {
    const attempts: AttemptRow[] = [];
    const results: ResultRow[] = [];
    const play = (rut: string, levels: number[], extra: Partial<AttemptRow> = {}) =>
      levels.forEach((n, i) => {
        const owner = attempt(rut, "color-sequence", i + 1, extra);

        attempts.push(owner);
        if (n > 0) results.push(level(owner, n));
      });

    play("1", [3, 3, 2, 3, 1, 3]);
    play("2", [2, 0, 0]);
    play("3", [1, 2, 3, 4]);

    return empty([student("1"), student("2"), student("3"), student("4")], attempts, results);
  }

  it("por defecto, 4 partidas sin avanzar", () => {
    const chart = run(stuckData(), { chart: "gen-stuck" });

    expect(chart.table?.columns.slice(4)).toEqual(["Nivel máximo", "Partidas sin avanzar", "Partidas jugadas", "Última partida"]);
    expect(chart.table?.rows).toHaveLength(1);
    expect(chart.table?.rows[0]?.slice(0, 2)).toEqual(["Nombre1 Apellido1", "1"]);
    expect(chart.table?.rows[0]?.slice(4, 7)).toEqual([3, 5, 6]);
    expect(chart.notes.join(" ")).toMatch(/4 o más/);
  });

  it("con 2 entra también quien lleva 2, y primero va quien lleva más", () => {
    const rows = run(stuckData(), { chart: "gen-stuck", options: '{"stuck":"2"}' }).table?.rows ?? [];

    expect(rows.map((row) => row[1])).toEqual(["1", "2"]);
  });

  it("una partida que sigue en curso no cuenta como no avanzar", () => {
    const data = stuckData();

    data.attempts.push(attempt("2", "color-sequence", 4, { status: "in_progress", lastActivityAt: new Date("2026-10-21T14:30:00Z") }));

    const rows = run(data, { chart: "gen-stuck", options: '{"stuck":"3"}' }).table?.rows ?? [];

    expect(rows.map((row) => row[1])).toEqual(["1"]);
  });

  it("nunca avanzó del nivel 0: «Ninguno»", () => {
    const attempts = [1, 2, 3, 4].map((n) => attempt("1", "color-sequence", n));
    const rows = run(empty([student("1")], attempts), { chart: "gen-stuck" }).table?.rows ?? [];

    expect(rows[0]?.[4]).toBe("Ninguno");
    expect(rows[0]?.[5]).toBe(4);
  });

  it("en nodos cuenta el nivel completado", () => {
    const attempts = [1, 2, 3, 4, 5].map((n) => attempt("1", "node-connection", n));
    const results = [level(attempts[0] as AttemptRow, 2)];
    const rows = run(empty([student("1")], attempts, results), { chart: "gen-stuck", options: '{"game":"node-connection"}' }).table?.rows ?? [];

    expect(rows[0]?.slice(4, 6)).toEqual([2, 4]);
  });
});

describe("Partidas fallidas repetidas", () => {
  const attempts = [
    attempt("1", "color-sequence", 1, { status: "failed" }),
    attempt("1", "color-sequence", 2, { status: "failed" }),
    attempt("1", "color-sequence", 3, { status: "failed" }),
    attempt("1", "color-sequence", 4),
    attempt("2", "color-sequence", 1, { status: "failed" }),
    attempt("3", "color-sequence", 1),
  ];
  const students = [student("1"), student("2"), student("3")];

  it("por defecto, 2 o más fallidas", () => {
    const chart = run(empty(students, attempts), { chart: "gen-failed" });

    expect(chart.table?.rows).toHaveLength(1);
    expect(chart.table?.rows[0]?.slice(4, 6)).toEqual([3, 4]);
  });

  it("con 1 entra también quien falló una vez", () => {
    const rows = run(empty(students, attempts), { chart: "gen-failed", options: '{"min":"1"}' }).table?.rows ?? [];

    expect(rows.map((row) => row[1])).toEqual(["1", "2"]);
  });
});

describe("Abandonan partidas a medias", () => {
  const old = new Date("2026-10-20T09:00:00Z"); // mas de 4 horas antes de NOW
  const attempts = [
    attempt("1", "color-sequence", 1, { status: "in_progress", lastActivityAt: old }),
    attempt("1", "color-sequence", 2, { status: "in_progress", lastActivityAt: old }),
    attempt("1", "color-sequence", 3),
    attempt("2", "color-sequence", 1, { status: "in_progress", lastActivityAt: old }),
    attempt("3", "color-sequence", 1, { status: "in_progress", lastActivityAt: new Date("2026-10-21T14:00:00Z") }),
  ];
  const students = [student("1"), student("2"), student("3")];

  it("por defecto, 2 o más; con su porcentaje", () => {
    const chart = run(empty(students, attempts), { chart: "gen-abandoners" });

    expect(chart.table?.rows).toHaveLength(1);
    expect(chart.table?.rows[0]?.slice(4, 7)).toEqual([2, 3, 67]);
  });

  it("una partida con actividad reciente no está abandonada", () => {
    const rows = run(empty(students, attempts), { chart: "gen-abandoners", options: '{"min":"1"}' }).table?.rows ?? [];

    expect(rows.map((row) => row[1])).toEqual(["1", "2"]);
  });
});

describe("Mini casos sin desbloquear", () => {
  function lockedData(): StatsData {
    const s1 = attempt("1", "color-sequence", 1);
    const n1 = attempt("1", "node-connection", 1);
    const s2 = attempt("2", "color-sequence", 1);
    const n2 = attempt("2", "node-connection", 1);

    return empty(
      [student("1"), student("2"), student("3"), student("4")],
      [s1, n1, s2, n2],
      [level(s1, 10), level(n1, 10), level(s2, 7), level(n2, 10)],
      [{ studentRut: "3", gameId: "mini-cases", unlockedAt: new Date("2026-10-12T15:00:00Z") }],
    );
  }

  it("lista a quien no lo tiene, del más cerca al más lejos, con lo que le falta", () => {
    const chart = run(lockedData(), { chart: "gen-locked" });
    const rows = chart.table?.rows ?? [];

    expect(rows.map((row) => row[1])).toEqual(["1", "2", "4"]);
    expect(rows[0]?.slice(4)).toEqual([10, 10, "Ya cumple la regla: el desbloqueo se registra cuando entre a su panel"]);
    expect(rows[1]?.slice(4)).toEqual([7, 10, "Le falta: Seriación: 3 niveles"]);
    expect(rows[2]?.slice(4)).toEqual([0, 0, "Le falta: Seriación: 10 niveles · Nodos: 10 niveles"]);
  });

  it("se puede acotar por cuánto le falta", () => {
    expect((run(lockedData(), { chart: "gen-locked", options: '{"near":"2"}' }).table?.rows ?? []).map((r) => r[1])).toEqual(["1"]);
    expect((run(lockedData(), { chart: "gen-locked", options: '{"near":"5"}' }).table?.rows ?? []).map((r) => r[1])).toEqual(["1", "2"]);
  });

  it("una partida de Seriación no aprobada no cuenta como nivel aprobado", () => {
    const data = lockedData();

    data.results.push(level(data.attempts[0] as AttemptRow, 12, false));

    const rows = run(data, { chart: "gen-locked" }).table?.rows ?? [];

    expect(rows[0]?.[4]).toBe(10);
  });
});

describe("Resumen del grupo: tarjetas con listas", () => {
  it("«Con Mini casos desbloqueado» abre quiénes no y quiénes sí", () => {
    const base = empty(
      [student("1"), student("2", { paternalLastName: "Beta" })],
      [],
      [],
      [{ studentRut: "2", gameId: "mini-cases", unlockedAt: new Date("2026-10-12T15:00:00Z") }],
    );
    const chart = run(base, { chart: "gen-summary" });
    const item = chart.cards?.[0]?.items.find((card) => card.label === "Con Mini casos desbloqueado");

    expect(item?.value).toBe("1");
    expect(item?.lists?.map((list) => list.title)).toEqual(["Quiénes no lo han desbloqueado", "Quiénes ya lo desbloquearon"]);
    expect(item?.lists?.[0]?.rows.map((row) => row[1])).toEqual(["1"]);
    expect(item?.lists?.[1]?.rows.map((row) => row[1])).toEqual(["2"]);
    expect(item?.lists?.[1]?.rows[0]?.[4]).toMatch(/12 oct 2026/);
  });

  it("«Han jugado al menos una vez» abre quiénes no han jugado", () => {
    const base = empty([student("1"), student("2")], [attempt("1", "color-sequence", 1)]);
    const item = run(base, { chart: "gen-summary" }).cards?.[0]?.items.find((card) => card.label === "Han jugado al menos una vez");

    expect(item?.lists?.[0]?.title).toBe("Quiénes no han jugado");
    expect(item?.lists?.[0]?.rows.map((row) => row[1])).toEqual(["2"]);
  });

  it("las demás tarjetas no traen listas", () => {
    const items = run(empty([student("1")]), { chart: "gen-summary" }).cards?.[0]?.items ?? [];

    expect(items.filter((item) => item.lists).map((item) => item.label)).toEqual([
      "Han jugado al menos una vez",
      "Con Mini casos desbloqueado",
    ]);
  });
});

describe("las listas no se comparan ni aceptan período", () => {
  it.each(["gen-inactive", "gen-stuck", "gen-failed", "gen-abandoners", "gen-locked"])("%s", (chart) => {
    expect(parseChartRequest({ chart }).ok).toBe(true);
    expect(parseChartRequest({ chart, period: "7d" }).ok).toBe(false);
    expect(parseChartRequest({ chart, groupBy: "university" }).ok).toBe(false);
    expect(parseChartRequest({ chart, filters: '{"device":["mobile"]}' }).ok).toBe(false);
  });

  it("rechaza valores de opción que no existen", () => {
    expect(parseChartRequest({ chart: "gen-inactive", options: '{"days":"9"}' }).ok).toBe(false);
    expect(parseChartRequest({ chart: "gen-stuck", options: '{"game":"mini-cases"}' }).ok).toBe(false);
  });
});
