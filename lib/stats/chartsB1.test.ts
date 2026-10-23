import { describe, expect, it } from "vitest";

import { buildChart } from "./charts";
import { parseChartRequest } from "./request";
import type {
  AttemptRow,
  ChartResult,
  GameId,
  ResultRow,
  StatsData,
  StudentRow,
  UnlockRow,
} from "./types";

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

function attempt(
  rut: string,
  gameId: GameId,
  attemptNumber: number,
  extra: Partial<AttemptRow> = {},
): AttemptRow {
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

function level(
  owner: AttemptRow,
  n: number,
  tryNumber: number,
  passed: boolean,
  metrics: Record<string, unknown> = {},
  seconds = 10,
): ResultRow {
  return {
    attemptId: owner.attemptId,
    studentRut: owner.studentRut,
    gameId: owner.gameId,
    key: `${n}.${tryNumber}`,
    index: n,
    tryNumber,
    metrics: { sequenceLength: n + 1, correctCount: passed ? n + 1 : 0, passed, ...metrics },
    activeMsNet: seconds * 1000,
    completedAt: new Date("2026-10-10T15:30:00Z"),
  };
}

function run(data: StatsData, query: Record<string, unknown>): ChartResult {
  // Las pruebas parten de la partida 1 de cada estudiante; partida: "" pide todas.
  const parsed = parseChartRequest({ partida: "1", ...query });

  if (!parsed.ok) throw new Error(parsed.message);

  return buildChart(parsed.def, parsed.request, data, NOW);
}

const only = (chart: ChartResult, key = "all") => {
  const found = chart.series.find((s) => s.key === key);

  if (!found) throw new Error(`Sin serie ${key}`);

  return found;
};

/**
 * s1: partida 1 llega al nivel 3 (nivel 2 al 2.o intento), partida 2 solo al 1.
 * s2: llega al nivel 1 y falla 3 veces el nivel 2.
 * s3: llega al nivel 12 (sin fallas), nivel 13 fallado.
 */
function data(): StatsData {
  const s1a = attempt("1", "color-sequence", 1);
  const s1b = attempt("1", "color-sequence", 2, { startedAt: new Date("2026-10-15T15:00:00Z") });
  const s2a = attempt("2", "color-sequence", 1, { status: "failed" });
  const s3a = attempt("3", "color-sequence", 1);

  const results = [
    level(s1a, 1, 1, true, { swapErrors: 0, substitutionErrors: 0 }),
    level(s1a, 2, 1, false, { swapErrors: 1, substitutionErrors: 0, firstErrorPosition: 1 }),
    level(s1a, 2, 2, true),
    level(s1a, 3, 1, true),
    level(s1b, 1, 1, true),
    level(s2a, 1, 1, true),
    level(s2a, 2, 1, false, { swapErrors: 0, substitutionErrors: 2, firstErrorPosition: 3 }),
    level(s2a, 2, 2, false, { swapErrors: 0, substitutionErrors: 1, firstErrorPosition: 2 }),
    level(s2a, 2, 3, false),
    ...Array.from({ length: 12 }, (_, i) => level(s3a, i + 1, 1, true, { meanInterTapMs: 800, firstTapMs: 1200, maxPauseMs: 2000 })),
    level(s3a, 13, 1, false, { swapErrors: 0, substitutionErrors: 1, firstErrorPosition: 14 }),
  ];

  return {
    students: [student("1"), student("2"), student("3"), student("4", { enabled: false })],
    attempts: [s1a, s1b, s2a, s3a],
    results,
    caseTitles: {},
  };
}

describe("S1: estudiantes que superaron cada nivel", () => {
  it("cuenta quienes superaron cada nivel (nunca sube) y trae vista de lineas y barras", () => {
    const chart = run(data(), { chart: "cs-reach", partida: "" });

    expect(chart.views).toEqual(["lines", "bars"]);
    expect(chart.categories).toHaveLength(12);
    // Nivel 1: s1, s2 y s3. Nivel 2: s1 y s3. Nivel 3: s1 y s3. Del 4 al 12: s3.
    expect(only(chart).values.slice(0, 5)).toEqual([3, 2, 2, 1, 1]);
    expect(only(chart).values.at(-1)).toBe(1);
  });

  it("en porcentaje es sobre todos los que jugaron", () => {
    const chart = run(data(), { chart: "cs-reach", partida: "", options: '{"as":"percent"}' });

    expect(only(chart).values.slice(0, 2)).toEqual([100, 66.7]);
  });
});

describe("S3: tramos de nivel maximo", () => {
  it("reparte en 4 tramos y suma todos los estudiantes; admite torta y apiladas", () => {
    const chart = run(data(), { chart: "cs-bands", partida: "" });

    expect(chart.views).toEqual(["bars", "pie", "stacked"]);
    expect(chart.categories).toEqual(["Hasta el nivel 5", "Niveles 6 a 9", "Niveles 10 a 12", "Nivel 13 o más"]);
    // s1 llego al 3, s2 al 1, s3 al 12.
    expect(only(chart).ns).toEqual([2, 0, 1, 0]);
  });
});

describe("S4: mejora entre partidas", () => {
  it("curva: nivel maximo mediano segun el numero de partida", () => {
    const chart = run(data(), { chart: "cs-improvement" });

    expect(chart.views).toEqual(["lines", "bars"]);
    expect(chart.categories).toEqual(["1", "2"]);
    // Partida 1: s1=3, s2=1, s3=12 -> mediana 3. Partida 2: solo s1=1.
    expect(only(chart).values).toEqual([3, 1]);
    expect(only(chart).ns).toEqual([3, 1]);
  });

  it("cambio: compara primera y ultima partida y solo cuenta a quien jugo 2 o mas", () => {
    const chart = run(data(), { chart: "cs-improvement", options: '{"measure":"change"}' });

    expect(chart.views).toEqual(["bars", "pie", "stacked"]);
    expect(chart.categories).toEqual(["Mejoró", "Quedó igual", "Empeoró"]);
    // Solo s1 tiene 2 partidas: de 3 a 1 -> empeoro.
    expect(only(chart).ns).toEqual([0, 0, 1]);
    expect(chart.notes.join(" ")).toMatch(/2 o más partidas/);
  });
});

describe("S5: intentos para superar un nivel", () => {
  it("a la primera, al 2.o, al 3.o o sin superar", () => {
    const chart = run(data(), { chart: "cs-tries", partida: "", countBy: "attempts" });

    expect(chart.unitLabel).toBe("niveles jugados");
    // A la primera: s1a n1,n3; s1b n1; s2a n1; s3a n1..n12 (12) = 16. 2.o: s1a n2. No lo supero: solo s2a n2
    // (agoto los 3 intentos); el nivel 13 de s3 tiene un solo intento fallido y queda a medias.
    expect(only(chart).ns).toEqual([16, 1, 0, 1]);
  });

  it("se puede acotar por tramo de niveles", () => {
    const chart = run(data(), {
      chart: "cs-tries",
      partida: "",
      countBy: "attempts",
      options: '{"as":"auto","levels":"11+"}',
    });

    // 11 y 12 superados a la primera; 13 sin superar (s3 con 1 intento de 3: el nivel quedo a medias).
    expect(only(chart).ns).toEqual([2, 0, 0, 0]);
    expect(chart.notes.join(" ")).toMatch(/Niveles 11 o más/i);
  });
});

describe("S6, S7 y S8: indicadores exploratorios", () => {
  it("tipo de error: intercambios y sustituciones, con aviso de exploratorio", () => {
    const chart = run(data(), { chart: "cs-error-type", partida: "" });

    expect(chart.exploratory).toBe(true);
    expect(chart.views).toEqual(["bars", "pie", "stacked"]);
    // Intercambios: 1 (s1). Sustituciones: 2 + 1 (s2) + 1 (s3) = 4.
    expect(only(chart).ns).toEqual([1, 4]);
    expect(chart.notes.join(" ")).toMatch(/exploratorio/);
  });

  it("dónde fallan primero: solo primer intento con error, por tercios de la secuencia", () => {
    const chart = run(data(), { chart: "cs-first-error", partida: "" });

    expect(chart.exploratory).toBe(true);
    // s1 n2: posicion 1 de 3 -> inicio. s2 n2: posicion 3 de 3 -> final. s3 n13: posicion 14 de 14 -> final.
    expect(only(chart).ns).toEqual([1, 0, 2]);
  });

  it("ritmo: mediana en segundos por nivel, con aviso de exploratorio", () => {
    const chart = run(data(), { chart: "cs-pace", partida: "" });

    expect(chart.exploratory).toBe(true);
    expect(chart.views).toEqual(["lines", "bars"]);
    expect(only(chart).values[0]).toBe(0.8);

    const first = run(data(), { chart: "cs-pace", partida: "", options: '{"measure":"first"}' });

    expect(only(first).values[0]).toBe(1.2);
  });
});

describe("G4: partidas por estudiante", () => {
  it("reparte a los estudiantes por cantidad de partidas e ignora a los deshabilitados", () => {
    const base = data();
    const extra = [attempt("4", "color-sequence", 1)];

    base.attempts.push(...extra);

    const chart = run(base, { chart: "gen-partidas" });

    expect(chart.views).toEqual(["bars", "pie", "stacked"]);
    // s1: 2 partidas; s2 y s3: 1. El 4 esta deshabilitado.
    expect(only(chart).ns).toEqual([2, 1, 0, 0]);
    expect(chart.studentsTotal).toBe(3);
  });

  it("acepta el periodo y un juego", () => {
    const chart = run(data(), { chart: "gen-partidas", period: "7d" });

    // En los ultimos 7 dias (desde el 15) solo juega s1 (su partida 2).
    expect(only(chart).ns).toEqual([1, 0, 0, 0]);
  });
});

describe("G5: cómo terminan las partidas", () => {
  it("terminadas, fallidas, abandonadas y en curso", () => {
    const base = data();

    base.attempts.push(
      attempt("1", "color-sequence", 3, {
        status: "in_progress",
        lastActivityAt: new Date("2026-10-18T10:00:00Z"),
      }),
      attempt("2", "color-sequence", 2, {
        status: "in_progress",
        lastActivityAt: new Date("2026-10-21T14:00:00Z"),
      }),
    );

    const chart = run(base, { chart: "gen-outcomes" });

    expect(chart.unitLabel).toBe("partidas");
    // Terminadas: s1a, s1b, s3a. Fallidas: s2a. Abandonada: la del 18. En curso: la de hoy.
    expect(only(chart).ns).toEqual([3, 1, 1, 1]);
    expect(chart.views).toEqual(["bars", "pie", "stacked"]);
  });
});

describe("G6: día y hora de juego", () => {
  it("por dia de la semana en hora de Chile", () => {
    const base = data();
    // Domingo 18 oct 2026 a las 23:30 en Chile = lunes 19 a las 02:30 UTC: sigue siendo domingo.
    base.attempts.push(attempt("2", "color-sequence", 2, { startedAt: new Date("2026-10-19T02:30:00Z") }));

    const chart = run(base, { chart: "gen-when" });

    expect(chart.categories[0]).toBe("Lunes");
    expect(chart.views).toEqual(["bars", "lines", "pie"]);
    // 10 oct = sabado (3 partidas), 15 oct = jueves (1), 18 oct = domingo (1).
    expect(only(chart).ns).toEqual([0, 0, 0, 1, 0, 3, 1]);
  });

  it("por hora no ofrece torta", () => {
    const chart = run(data(), { chart: "gen-when", options: '{"by":"hour"}' });

    expect(chart.views).toEqual(["bars", "lines"]);
    expect(chart.categories).toHaveLength(24);
    // 15:00 UTC = 12:00 en Chile (UTC-3): las 4 partidas empiezan a esa hora.
    expect(only(chart).ns[12]).toBe(4);
  });
});

describe("G8: estudiantes sin partidas", () => {
  it("lista a los habilitados que no han jugado, con su ficha, en una tabla", () => {
    const base = data();

    base.students.push(
      student("5", { paternalLastName: "Zúñiga", university: "uvm", studyShift: "evening", ciudad: "Temuco" }),
    );

    const chart = run(base, { chart: "gen-no-play" });

    expect(chart.views).toEqual([]);
    expect(chart.table?.columns[0]).toBe("Estudiante");
    expect(chart.table?.rows).toHaveLength(1);
    expect(chart.table?.rows[0]).toEqual(["Nombre5 Zúñiga", "5", 1, "UVM", "Vespertina", "Temuco"]);
    expect(chart.studentsTotal).toBe(1);
    expect(chart.warnings.join(" ")).not.toMatch(/No hay datos/);
  });

  it("por juego: sin partidas en nodos son todos los que no la jugaron", () => {
    const chart = run(data(), { chart: "gen-no-play", options: '{"game":"node-connection"}' });

    expect(chart.table?.rows).toHaveLength(3);
  });

  it("sin nadie pendiente lo dice", () => {
    const base = data();

    base.students = base.students.slice(0, 3);

    const chart = run(base, { chart: "gen-no-play" });

    expect(chart.table?.rows).toHaveLength(0);
    expect(chart.notes.join(" ")).toMatch(/ya jugaron/);
  });
});

describe("G1: resumen del grupo", () => {
  it("tarjetas con habilitados, quienes jugaron, mini casos desbloqueado y niveles tipicos", () => {
    const base = data();
    const unlocks: UnlockRow[] = [{ studentRut: "3", gameId: "mini-cases", unlockedAt: new Date("2026-10-12T12:00:00Z") }];

    base.unlocks = unlocks;
    base.attempts.push(attempt("1", "node-connection", 1));
    base.results.push({
      attemptId: base.attempts.at(-1)!.attemptId,
      studentRut: "1",
      gameId: "node-connection",
      key: "4",
      index: 4,
      tryNumber: 1,
      metrics: {},
      activeMsNet: 40_000,
      completedAt: new Date("2026-10-10T15:30:00Z"),
    });

    const chart = run(base, { chart: "gen-summary" });
    const items = Object.fromEntries((chart.cards?.[0]?.items ?? []).map((i) => [i.label, i]));

    expect(chart.views).toEqual(["cards"]);
    expect(items["Estudiantes habilitados"]?.value).toBe("3");
    expect(items["Han jugado al menos una vez"]?.value).toBe("3");
    expect(items["Con Mini casos desbloqueado"]?.value).toBe("1");
    expect(items["Con Mini casos desbloqueado"]?.hint).toMatch(/33 %/);
    // Niveles maximos de Seriacion: s1=3, s2=1, s3=12 -> mediana 3.
    expect(items["Nivel típico en Seriación (mediana)"]?.value).toBe("3,0");
    expect(items["Nivel típico en Nodos (mediana)"]?.value).toBe("4,0");
    expect(chart.table?.columns).toEqual(["Indicador", "Todos los estudiantes"]);
    expect(chart.studentsTotal).toBe(3);
  });

  it("el deshabilitado no entra al resumen y al comparar hay un bloque por grupo", () => {
    const base = data();

    base.students[0] = { ...base.students[0]!, university: "uvm" };
    base.students[1] = { ...base.students[1]!, university: "santo-tomas" };
    base.students[3] = { ...base.students[3]!, university: "uvm" };

    const chart = run(base, { chart: "gen-summary", groupBy: "university" });

    expect(chart.cards?.map((c) => c.group)).toEqual(["Santo Tomás", "UVM", "Sin dato"]);
    expect(chart.cards?.find((c) => c.group === "UVM")?.items[0]?.value).toBe("1");
  });
});

describe("periodo y dispositivo en los graficos nuevos", () => {
  it("un grafico que no admite periodo lo rechaza", () => {
    expect(parseChartRequest({ chart: "gen-summary", period: "7d" }).ok).toBe(false);
    expect(parseChartRequest({ chart: "gen-no-play", period: "7d" }).ok).toBe(false);
    expect(parseChartRequest({ chart: "activity", period: "7d" }).ok).toBe(false);
    expect(parseChartRequest({ chart: "cs-bands", period: "7d" }).ok).toBe(true);
    expect(parseChartRequest({ chart: "gen-when", period: "7d" }).ok).toBe(true);
  });

  it("el resumen y la lista de pendientes no se separan por dispositivo", () => {
    expect(parseChartRequest({ chart: "gen-summary", groupBy: "device" }).ok).toBe(false);
    expect(parseChartRequest({ chart: "gen-no-play", filters: '{"device":["mobile"]}' }).ok).toBe(false);
    expect(parseChartRequest({ chart: "gen-outcomes", groupBy: "device" }).ok).toBe(true);
  });
});

describe("comparar", () => {
  it("la lista de pendientes no se compara por grupos", () => {
    expect(parseChartRequest({ chart: "gen-no-play", groupBy: "university" }).ok).toBe(false);
    expect(parseChartRequest({ chart: "gen-no-play" }).ok).toBe(true);
  });
});

describe("comparar por dispositivo con todas las partidas juntas", () => {
  const sessionOf = (pointer: string, w: number, h: number) => [
    { device: { pointer, viewportWidth: w, viewportHeight: h } },
  ];

  it("quien jugo en dos aparatos aparece en ambos, cada uno con lo que jugo ahi", () => {
    const base = data();
    // s1a (nivel 3) en celular, s1b (nivel 1) en computador; s2 celular; s3 computador.
    const [s1a, s1b, s2a, s3a] = base.attempts as [AttemptRow, AttemptRow, AttemptRow, AttemptRow];

    base.attempts = [
      { ...s1a, sessions: sessionOf("touch", 390, 844) },
      { ...s1b, sessions: sessionOf("mouse", 1440, 900) },
      { ...s2a, sessions: sessionOf("touch", 390, 844) },
      { ...s3a, sessions: sessionOf("mouse", 1440, 900) },
    ];

    const chart = run(base, {
      chart: "cs-reach",
      groupBy: "device",
      partida: "",
      countBy: "students",
      options: '{"as":"count"}',
    });

    // Celular: s1 (niveles 1 a 3) y s2 (nivel 1). Computador: s1 (solo nivel 1) y s3 (hasta el 12).
    expect(only(chart, "mobile").values.slice(0, 3)).toEqual([2, 1, 1]);
    expect(only(chart, "desktop").values.slice(0, 3)).toEqual([2, 1, 1]);
    expect(chart.notes.join(" ")).toMatch(/aparece en cada uno/);
  });
});

describe("tramos de edad: comparar y filtrar", () => {
  function aged(): StatsData {
    const mk = (rut: string, age: number) =>
      attempt(rut, "color-sequence", 1, {
        student: { ageAtStart: age } as AttemptRow["student"],
      });
    const a = mk("1", 19);
    const b = mk("2", 22);
    const c = mk("3", 28);
    const d = mk("4", 25);

    return {
      students: [student("1"), student("2"), student("3"), student("4")],
      attempts: [a, b, c, d],
      results: [a, b, c, d].map((x) => level(x, 1, 1, true)),
      caseTitles: {},
    };
  }

  it("compara por tramos de 5 en 5, en orden y con su nombre", () => {
    const chart = run(aged(), { chart: "cs-reach", groupBy: "ageBand" });

    expect(chart.series.map((s) => [s.key, s.label, s.n])).toEqual([
      ["17-20", "17 a 20 años", 1],
      ["21-25", "21 a 25 años", 2],
      ["26-30", "26 a 30 años", 1],
    ]);
  });

  it("elegir tramos deja solo esos grupos", () => {
    const chart = run(aged(), {
      chart: "cs-reach",
      groupBy: "ageBand",
      filters: '{"ageBand":["21-25","26-30"]}',
    });

    expect(chart.series.map((s) => s.key)).toEqual(["21-25", "26-30"]);
  });
});
