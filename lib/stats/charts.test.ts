import { describe, expect, it } from "vitest";

import { buildChart, findChart } from "./charts";
import { groupItems, passesFilters, pickPartida, type GroupItem } from "./pipeline";
import { parseChartRequest } from "./request";
import type {
  AttemptRow,
  ChartResult,
  GameId,
  ResultRow,
  StatsData,
  StudentRow,
} from "./types";

const NOW = new Date("2026-10-21T15:00:00Z");

function student(rut: string, extra: Partial<StudentRow> = {}): StudentRow {
  return {
    rut,
    firstName: `Nombre${rut}`,
    paternalLastName: `Apellido${rut}`,
    paralelo: 1,
    enabled: true,
    ...extra,
  };
}

let counter = 0;

function attempt(
  rut: string,
  gameId: GameId,
  attemptNumber: number,
  extra: Partial<AttemptRow> = {},
): AttemptRow {
  counter += 1;

  return {
    attemptId: `att-${rut}-${gameId}-${attemptNumber}-${counter}`,
    studentRut: rut,
    gameId,
    attemptNumber,
    status: "finished",
    startedAt: new Date("2026-10-10T12:00:00Z"),
    lastActivityAt: new Date("2026-10-10T13:00:00Z"),
    contentVersion: gameId === "color-sequence" ? "color-sequence-2" : gameId,
    student: null,
    ...extra,
  };
}

function result(
  owner: AttemptRow,
  key: string,
  index: number,
  tryNumber: number,
  seconds: number,
  metrics: Record<string, unknown> = {},
  completedAt = "2026-10-10T12:30:00Z",
): ResultRow {
  return {
    attemptId: owner.attemptId,
    studentRut: owner.studentRut,
    gameId: owner.gameId,
    key,
    index,
    tryNumber,
    metrics,
    activeMsNet: seconds * 1000,
    completedAt: new Date(completedAt),
  };
}

const level = (
  owner: AttemptRow,
  n: number,
  tryNumber: number,
  passed: boolean,
  seconds: number,
) =>
  result(owner, `${n}.${tryNumber}`, n, tryNumber, seconds, {
    sequenceLength: n + 1,
    correctCount: passed ? n + 1 : 0,
    passed,
  });

function run(
  data: StatsData,
  query: Record<string, unknown>,
  now = NOW,
): ChartResult {
  // Las pruebas parten de la partida 1 de cada estudiante; partida: "" pide todas.
  const parsed = parseChartRequest({ partida: "1", ...query });

  if (!parsed.ok) throw new Error(parsed.message);

  return buildChart(parsed.def, parsed.request, data, now);
}

function seriesOf(result: ChartResult, key = "all") {
  const found = result.series.find((s) => s.key === key);

  if (!found) throw new Error(`Sin serie ${key}: ${result.series.map((s) => s.key)}`);

  return found;
}

/** Seriacion: s1 llega al nivel 3, s2 al 1, s3 al 2; s1 juega una segunda partida. */
function colorData(): StatsData {
  const students = [
    student("1", { paralelo: 1, university: "uvm", gender: "female" }),
    student("2", { paralelo: 1, university: "uvm", gender: "male" }),
    student("3", { paralelo: 2, university: "santo-tomas", gender: "female" }),
    student("4", { paralelo: 2 }),
  ];

  const s1a = attempt("1", "color-sequence", 1);
  const s1b = attempt("1", "color-sequence", 2);
  const s2a = attempt("2", "color-sequence", 1);
  const s3a = attempt("3", "color-sequence", 1);

  const results = [
    level(s1a, 1, 1, true, 10),
    level(s1a, 2, 1, true, 20),
    level(s1a, 3, 1, false, 30),
    level(s1a, 3, 2, true, 25),
    level(s1b, 1, 1, true, 9),
    level(s2a, 1, 1, true, 14),
    level(s2a, 2, 1, false, 40),
    level(s2a, 2, 2, false, 41),
    level(s2a, 2, 3, false, 42),
    level(s3a, 1, 1, true, 12),
    level(s3a, 2, 1, true, 22),
  ];

  return {
    students,
    attempts: [s1a, s1b, s2a, s3a],
    results,
    caseTitles: {},
  };
}

describe("pickPartida", () => {
  const a1 = attempt("1", "color-sequence", 1);
  const a2 = attempt("1", "color-sequence", 2);
  const a3 = attempt("1", "color-sequence", 3);
  const b1 = attempt("2", "color-sequence", 1);

  it("sin cantidad devuelve todas", () => {
    expect(pickPartida([a1, a2, b1], null)).toEqual([a1, a2, b1]);
  });

  it("las primeras N de cada estudiante, en el orden en que venian", () => {
    expect(pickPartida([a3, a2, a1, b1], 1)).toEqual([a1, b1]);
    expect(pickPartida([a3, a2, a1, b1], 2)).toEqual([a2, a1, b1]);
  });

  it("las ultimas N de cada estudiante", () => {
    expect(pickPartida([a1, a2, a3, b1], 1, "last")).toEqual([a3, b1]);
    expect(pickPartida([a1, a2, a3, b1], 2, "last")).toEqual([a2, a3, b1]);
  });

  it("quien jugo menos que N entra con las que jugo", () => {
    expect(pickPartida([a1, a2, b1], 12)).toEqual([a1, a2, b1]);
    expect(pickPartida([a1, a2, b1], 12, "last")).toEqual([a1, a2, b1]);
  });
});

describe("nota de datos que faltan en la ficha", () => {
  const note = (query: Record<string, string>) =>
    run(colorData(), { chart: "cs-max-level", partida: "", ...query }).notes.join(" ");

  it("sin filtros no hay nota", () => {
    expect(note({})).not.toMatch(/ficha/);
  });

  it("dice cuántos estudiantes quedan fuera y por qué dato", () => {
    // El estudiante 4 no tiene universidad ni género; el resto sí.
    expect(note({ filters: '{"university":["uvm"]}' })).toMatch(/1 sin universidad/);
  });

  it("junta varios datos en una sola frase", () => {
    const text = note({ filters: '{"university":["uvm"],"gender":["female"]}' });

    expect(text).toMatch(/1 sin universidad/);
    expect(text).toMatch(/1 sin género/);
  });

  it("si nadie falta, lo dice", () => {
    expect(note({ filters: '{"paralelo":["1"]}' })).toMatch(/Ningún estudiante habilitado quedó fuera/);
  });

  it("los deshabilitados no cuentan", () => {
    const data = colorData();

    data.students[3] = { ...(data.students[3] as StudentRow), enabled: false };

    const text = run(data, { chart: "cs-max-level", partida: "", filters: '{"university":["uvm"]}' }).notes.join(" ");

    expect(text).toMatch(/Ningún estudiante habilitado quedó fuera/);
  });
});

describe("passesFilters", () => {
  const valueOf = (values: Record<string, string | null>) => (d: string) => values[d] ?? null;

  it("dentro de una caracteristica son alternativas; entre caracteristicas se exigen todas", () => {
    const filters = { paralelo: ["1", "2"], gender: ["female"] };

    expect(passesFilters(filters, valueOf({ paralelo: "2", gender: "female" }))).toBe(true);
    expect(passesFilters(filters, valueOf({ paralelo: "3", gender: "female" }))).toBe(false);
    expect(passesFilters(filters, valueOf({ paralelo: "1", gender: "male" }))).toBe(false);
  });

  it("'none' selecciona a quienes no tienen el dato", () => {
    expect(passesFilters({ gender: ["none"] }, valueOf({}))).toBe(true);
    expect(passesFilters({ gender: ["none"] }, valueOf({ gender: "male" }))).toBe(false);
  });
});

describe("groupItems", () => {
  const items = (values: (string | null)[]): GroupItem<string>[] =>
    values.map((value, i) => ({
      item: `item-${i}`,
      rut: `rut-${i}`,
      valueOf: () => value,
    }));

  const none = { groupBy: "region" as const, students: [] };

  it("los valores fijos conservan su color aunque falten otros", () => {
    const grouped = groupItems(items(["3", "1"]), { groupBy: "paralelo", students: [] }, new Map());

    expect(grouped.specs).toEqual([
      { key: "1", label: "Paralelo 1", slot: 0 },
      { key: "3", label: "Paralelo 3", slot: 2 },
    ]);
  });

  it("'Sin dato' va al final y en gris", () => {
    const grouped = groupItems(items([null, "b", "a"]), none, new Map());

    expect(grouped.specs.map((s) => s.key)).toEqual(["a", "b", "none"]);
    expect(grouped.specs[2]?.slot).toBe(-2);
  });

  it("con mas de 7 grupos los de menos estudiantes pasan a 'Otros'", () => {
    // 8 regiones: r1 tiene 2 estudiantes, el resto 1.
    const values = ["r1", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"];
    const grouped = groupItems(items(values), none, new Map());
    const keys = grouped.specs.map((s) => s.key);

    expect(keys).toHaveLength(8);
    expect(keys).toContain("r1");
    expect(keys[keys.length - 1]).toBe("others");
    expect(grouped.specs[keys.length - 1]).toMatchObject({ label: "Otros", slot: -1 });

    const total = [...grouped.byGroup.values()].reduce((sum, list) => sum + list.length, 0);

    expect(total).toBe(values.length);
  });

  it("por estudiante: dos con el mismo nombre se distinguen por RUT", () => {
    const students = new Map([
      ["a-1", { rut: "a-1", firstName: "Ana", paternalLastName: "Soto" }],
      ["b-2", { rut: "b-2", firstName: "Ana", paternalLastName: "Soto" }],
      ["c-3", { rut: "c-3", firstName: "Luis", paternalLastName: "Soto" }],
    ]);
    const grouped = groupItems(
      items(["x"]),
      { groupBy: "student", students: ["a-1", "b-2", "c-3"] },
      students,
    );

    expect(grouped.specs.map((s) => s.label)).toEqual(["Ana Soto (a-1)", "Ana Soto (b-2)", "Luis Soto"]);
  });

  it("por estudiante: respeta el orden pedido y deja vacio al que no tiene datos", () => {
    const grouped = groupItems(
      items(["x", "y"]),
      { groupBy: "student", students: ["rut-1", "rut-9"] },
      new Map(),
    );

    expect(grouped.specs.map((s) => [s.key, s.slot])).toEqual([
      ["rut-1", 0],
      ["rut-9", 1],
    ]);
    expect(grouped.byGroup.get("rut-1")).toEqual(["item-1"]);
    expect(grouped.byGroup.get("rut-9")).toEqual([]);
  });
});

describe("Seriacion: nivel maximo superado", () => {
  it("cuenta estudiantes por nivel con la primera partida", () => {
    const chart = run(colorData(), { chart: "cs-max-level" });
    const all = seriesOf(chart);

    expect(chart.categories).toEqual(["0", "1", "2", "3"]);
    expect(all.values).toEqual([0, 1, 1, 1]);
    expect(all.n).toBe(3);
    expect(chart.unit).toBe("students");
    expect(chart.unitLabel).toBe("estudiantes");
  });

  it("en porcentaje reparte sobre los estudiantes del grupo", () => {
    const chart = run(colorData(), { chart: "cs-max-level", options: '{"as":"percent"}' });

    expect(seriesOf(chart).values).toEqual([0, 33.3, 33.3, 33.3]);
    expect(chart.unit).toBe("percent");
  });

  it("partida 1 usa la primera partida de cada estudiante: s1 llego al 3", () => {
    const chart = run(colorData(), { chart: "cs-max-level", partida: "1" });

    expect(seriesOf(chart).n).toBe(3);
    expect(seriesOf(chart).values).toEqual([0, 1, 1, 1]);
    expect(chart.notes.join(" ")).toMatch(/primera partida de cada estudiante/);
  });

  it("partida 1 con «últimas» usa la última de cada estudiante: s1 solo llegó al 1", () => {
    const chart = run(colorData(), { chart: "cs-max-level", partida: "1", take: "last" });

    expect(seriesOf(chart).n).toBe(3);
    expect(seriesOf(chart).values).toEqual([0, 2, 1]);
    expect(chart.notes.join(" ")).toMatch(/última partida de cada estudiante/);
  });

  it("partida 2 toma hasta 2 partidas por estudiante: quien jugó menos entra con las que jugó", () => {
    const chart = run(colorData(), { chart: "cs-max-level", partida: "2" });

    // s1 (2 partidas, mejor nivel 3), s2 (1 partida) y s3 (1 partida).
    expect(seriesOf(chart).n).toBe(3);
    expect(seriesOf(chart).values).toEqual([0, 1, 1, 1]);
    expect(chart.notes.join(" ")).toMatch(/2 partidas más antiguas/);
    expect(chart.notes.join(" ")).toMatch(/Quien jugó menos entra con las que jugó/);
  });

  it("partida 2 contando partidas cuenta cada una de las que entran", () => {
    const chart = run(colorData(), { chart: "cs-max-level", partida: "2", countBy: "attempts" });

    expect(seriesOf(chart).values).toEqual([0, 2, 1, 1]);
    expect(chart.unitLabel).toBe("partidas");
  });

  it("con todas las partidas sigue contando estudiantes: cada uno una vez, con su mejor nivel", () => {
    const chart = run(colorData(), { chart: "cs-max-level", partida: "" });

    // s1 llego al 3 (su segunda partida solo al 1), s2 al 1 y s3 al 2.
    expect(seriesOf(chart).values).toEqual([0, 1, 1, 1]);
    expect(chart.unitLabel).toBe("estudiantes");
    expect(chart.yLabel).toBe("Estudiantes");
    expect(seriesOf(chart).n).toBe(3);
    expect(chart.notes.join(" ")).toMatch(/cada uno cuenta una sola vez/);
  });

  it("«Contar partidas» cuenta cada partida por separado y lo dice", () => {
    const chart = run(colorData(), { chart: "cs-max-level", partida: "", countBy: "attempts" });

    expect(seriesOf(chart).values).toEqual([0, 2, 1, 1]);
    expect(chart.unitLabel).toBe("partidas");
    expect(chart.yLabel).toBe("Partidas");
    expect(chart.notes.join(" ")).toMatch(/cada partida por separado/);
  });

  it("contar partidas no cambia nada si se eligio la primera o la ultima", () => {
    const base = run(colorData(), { chart: "cs-max-level", partida: "1" });
    const same = run(colorData(), { chart: "cs-max-level", partida: "1", countBy: "attempts" });

    expect(seriesOf(same).values).toEqual(seriesOf(base).values);
    expect(same.unitLabel).toBe("estudiantes");
  });

  it("los tiempos de un estudiante con varias partidas se juntan en uno solo", () => {
    // s1 resolvio el nivel 1 en 10 s (partida 1) y 9 s (partida 2).
    const chart = run(colorData(), { chart: "cs-time", partida: "" });

    // Medianas por estudiante: s1 = 9,5; s2 = 14; s3 = 12 -> mediana de las tres = 12.
    expect(seriesOf(chart).values[0]).toBe(12);
    expect(seriesOf(chart).ns[0]).toBe(3);
  });

  it("la aprobacion por nivel cuenta estudiantes: aprobo si lo logro en alguna partida", () => {
    const chart = run(colorData(), { chart: "cs-pass-rate", partida: "" });

    expect(seriesOf(chart).ns[0]).toBe(3);
    expect(seriesOf(chart).values[0]).toBe(100);
  });

  it("al comparar usa porcentaje por defecto y no avisa de grupos chicos", () => {
    const chart = run(colorData(), { chart: "cs-max-level", groupBy: "paralelo" });

    expect(chart.unit).toBe("percent");
    expect(seriesOf(chart, "1").values).toEqual([0, 50, 0, 50]);
    expect(seriesOf(chart, "2").values).toEqual([0, 0, 100, 0]);
    expect(seriesOf(chart, "1")).toMatchObject({ n: 2, slot: 0 });
    expect(seriesOf(chart, "2")).toMatchObject({ n: 1, slot: 1 });
    // Con grupos de 2 y 1 estudiantes no hay ningun aviso de "pocos datos".
    expect(chart.warnings).toEqual([]);
    expect(JSON.stringify(chart)).not.toMatch(/lowN|Pocos estudiantes|No saques conclusiones/);
  });

  it("filtra por caracteristica antes de contar", () => {
    const chart = run(colorData(), {
      chart: "cs-max-level",
      filters: '{"gender":["female"]}',
    });

    // s1 (nivel 3) y s3 (nivel 2).
    expect(seriesOf(chart).values).toEqual([0, 0, 1, 1]);
    expect(seriesOf(chart).n).toBe(2);
  });

  it("al filtrar quedan fuera los estudiantes sin ese dato, y se avisa", () => {
    const data = colorData();
    const s4a = attempt("4", "color-sequence", 1);

    data.attempts.push(s4a);
    data.results.push(level(s4a, 1, 1, true, 8));

    // s4 no tiene genero: con el filtro puesto no entra; sin filtro, si.
    const filtered = run(data, { chart: "cs-max-level", filters: '{"gender":["female","male"]}' });
    const all = run(data, { chart: "cs-max-level" });

    expect(seriesOf(filtered).n).toBe(3);
    expect(seriesOf(all).n).toBe(4);
    expect(filtered.notes.join(" ")).toMatch(/quedan fuera/);
    expect(all.notes.join(" ")).not.toMatch(/quedan fuera/);
  });

  it("en la comparacion, quienes no tienen el dato van en 'Sin dato'", () => {
    const chart = run(colorData(), { chart: "cs-max-level", groupBy: "gender" });

    expect(chart.series.map((s) => s.key)).toEqual(["female", "male"]);

    const data = colorData();
    const s4a = attempt("4", "color-sequence", 1);

    data.attempts.push(s4a);
    data.results.push(level(s4a, 1, 1, true, 8));

    const withNone = run(data, { chart: "cs-max-level", groupBy: "gender" });

    expect(withNone.series.map((s) => s.key)).toEqual(["female", "male", "none"]);
  });

  it("filtra por rango de edad con la edad de la partida", () => {
    const data = colorData();

    data.students[0] = { ...(data.students[0] as StudentRow), birthDate: "2000-01-01" }; // 26
    data.students[1] = { ...(data.students[1] as StudentRow), birthDate: "1990-01-01" }; // 36 hoy
    data.students[2] = { ...(data.students[2] as StudentRow), birthDate: "1980-01-01" }; // 46
    // La foto de la partida de s2 dice 19: manda sobre la fecha de nacimiento actual.
    data.attempts[2] = { ...(data.attempts[2] as AttemptRow), student: { ageAtStart: 19 } };

    const young = run(data, { chart: "cs-max-level", age: '{"min":18,"max":30}' });

    expect(seriesOf(young).n).toBe(2);

    const older = run(data, { chart: "cs-max-level", age: '{"min":30}' });

    expect(seriesOf(older).n).toBe(1);
    expect(older.notes.join(" ")).toMatch(/quedan fuera/);

    expect(seriesOf(run(data, { chart: "cs-max-level", age: '{"max":19}' })).n).toBe(1);
    expect(seriesOf(run(data, { chart: "cs-max-level" })).n).toBe(3);
  });

  it("con rango de edad, quien no tiene fecha de nacimiento queda fuera", () => {
    const chart = run(colorData(), { chart: "cs-max-level", age: '{"min":17,"max":80}' });

    expect(chart.warnings.join(" ")).toMatch(/No hay datos/);
  });

  it("agrupa regiones escritas distinto bajo su nombre oficial y ciudades sin importar mayusculas", () => {
    const data = colorData();

    data.students[0] = { ...(data.students[0] as StudentRow), region: "region metropolitana", ciudad: "SANTIAGO" };
    data.students[1] = { ...(data.students[1] as StudentRow), region: "RM", ciudad: "santiago" };
    data.students[2] = { ...(data.students[2] as StudentRow), region: "Biobio", ciudad: "Los Ángeles" };

    const regions = run(data, { chart: "cs-max-level", groupBy: "region" });

    expect(regions.series.map((s) => s.label)).toEqual(["Metropolitana de Santiago", "Biobío"]);
    expect(seriesOf(regions, "Metropolitana de Santiago").n).toBe(2);

    const cities = run(data, { chart: "cs-max-level", groupBy: "ciudad", filters: '{"region":["Metropolitana de Santiago"]}' });

    expect(cities.series.map((s) => [s.label, s.n])).toEqual([["Santiago", 2]]);
  });

  it("la foto de la partida manda sobre la ficha actual", () => {
    const data = colorData();

    // La ficha de s1 dice paralelo 1, pero cuando jugo estaba en el 3.
    data.attempts[0] = { ...(data.attempts[0] as AttemptRow), student: { paralelo: 3 } };

    const chart = run(data, { chart: "cs-max-level", groupBy: "paralelo" });

    expect(chart.series.map((s) => s.key)).toEqual(["1", "2", "3"]);
    expect(seriesOf(chart, "3").n).toBe(1);
  });

  it("nunca habla de versiones: ni en las notas ni en la peticion", () => {
    const chart = run(colorData(), { chart: "cs-max-level", partida: "" });

    expect(JSON.stringify(chart)).not.toMatch(/ersi[oó]n/);
  });

  it("un estudiante deshabilitado no entra a ningun grafico", () => {
    const data = colorData();

    data.students[2] = { ...(data.students[2] as StudentRow), enabled: false };

    for (const query of [
      { chart: "cs-max-level" },
      { chart: "cs-time", partida: "" },
      { chart: "cs-pass-rate" },
      { chart: "activity" },
    ]) {
      const chart = run(data, query);

      expect(chart.studentsTotal, query.chart).toBe(2);
      expect(chart.notes.join(" ")).toMatch(/habilitados/);
    }

    // La participacion cuenta a los habilitados aunque no hayan jugado (1, 2 y 4), nunca al 3.
    const participation = run(data, { chart: "participation", as: "count" });

    expect(participation.studentsTotal).toBe(3);
    expect(participation.notes.join(" ")).toMatch(/habilitados/);

    expect(seriesOf(run(data, { chart: "cs-max-level" })).values).toEqual([0, 1, 0, 1]);
  });

  it("un estudiante que ya no esta en la base tampoco cuenta", () => {
    const data = colorData();

    data.students = data.students.filter((s) => s.rut !== "3");

    expect(run(data, { chart: "cs-max-level" }).studentsTotal).toBe(2);
  });

  it("el período deja solo las partidas iniciadas en esa ventana (hora de Chile)", () => {
    const data = colorData();
    // Hoy es miercoles 21 oct 2026. s1 (partida 2) y s2 juegan el lunes 19 y el 20; el resto, el 10.
    data.attempts[1] = { ...(data.attempts[1] as AttemptRow), startedAt: new Date("2026-10-20T15:00:00Z") };
    data.attempts[2] = { ...(data.attempts[2] as AttemptRow), startedAt: new Date("2026-10-19T04:00:00Z") };

    const count = (period: string) =>
      seriesOf(run(data, { chart: "cs-max-level", partida: "", period })).n;

    expect(count("all")).toBe(3);
    expect(count("3d")).toBe(2); // desde el lunes 19 a las 00:00 de Chile
    expect(count("7d")).toBe(2);
    expect(count("30d")).toBe(3);
    expect(count("week")).toBe(2);
    expect(count("month")).toBe(3);
  });

  it("las primeras N se cuentan dentro del período: la primera de s1 en los últimos 7 días es su segunda partida", () => {
    const data = colorData();

    data.attempts[1] = { ...(data.attempts[1] as AttemptRow), startedAt: new Date("2026-10-20T15:00:00Z") };
    data.attempts[2] = { ...(data.attempts[2] as AttemptRow), startedAt: new Date("2026-10-19T15:00:00Z") };

    const first = run(data, { chart: "cs-max-level", partida: "1", period: "7d" });

    // s1 entra con su partida 2 (nivel 1) porque la 1 es del 10; s2 con la suya (nivel 1).
    expect(seriesOf(first).n).toBe(2);
    expect(seriesOf(first).values).toEqual([0, 2]);
    expect(first.notes.join(" ")).toMatch(/Últimos 7 días/i);
    expect(first.notes.join(" ")).toMatch(/primera partida de cada estudiante dentro del período elegido/);
  });

  it("el filtro de dispositivo separa celular, tableta y computador, y lo aclara", () => {
    const data = colorData();
    const sessionOf = (pointer: string, w: number, h: number) => [
      { device: { pointer, viewportWidth: w, viewportHeight: h } },
    ];

    data.attempts[0] = { ...(data.attempts[0] as AttemptRow), sessions: sessionOf("touch", 390, 844) };
    data.attempts[1] = { ...(data.attempts[1] as AttemptRow), sessions: sessionOf("touch", 390, 844) };
    data.attempts[2] = { ...(data.attempts[2] as AttemptRow), sessions: sessionOf("touch", 820, 1180) };
    data.attempts[3] = { ...(data.attempts[3] as AttemptRow), sessions: sessionOf("mouse", 1440, 900) };

    const tablets = run(data, { chart: "cs-max-level", filters: '{"device":["tablet"]}' });

    expect(seriesOf(tablets).n).toBe(1);
    expect(tablets.notes.join(" ")).toMatch(/una tableta no se cuenta como celular/);

    const split = run(data, { chart: "cs-max-level", groupBy: "device" });

    expect(split.series.map((x) => [x.label, x.n])).toEqual([
      ["Celular", 1],
      ["Tableta", 1],
      ["Computador", 1],
    ]);

    const mobileOrDesktop = run(data, { chart: "cs-max-level", filters: '{"device":["mobile","desktop"]}' });

    expect(seriesOf(mobileOrDesktop).n).toBe(2);
  });

  it("una partida sin datos del aparato queda como «Sin dato» al separar por dispositivo", () => {
    const chart = run(colorData(), { chart: "cs-max-level", groupBy: "device" });

    expect(chart.series.map((x) => x.key)).toEqual(["none"]);
  });

  it("sin datos avisa y no inventa columnas", () => {
    const chart = run(
      { students: [], attempts: [], results: [], caseTitles: {} },
      { chart: "cs-max-level" },
    );

    expect(chart.warnings.join(" ")).toMatch(/No hay datos/);
    expect(chart.studentsTotal).toBe(0);
  });
});

describe("Seriacion: aprobacion por nivel", () => {
  it("primer intento: solo cuenta el intento 1 de cada nivel", () => {
    const chart = run(colorData(), { chart: "cs-pass-rate" });
    const all = seriesOf(chart);

    expect(chart.views).toEqual(["lines", "bars"]);
    expect(chart.categories).toEqual(["1", "2", "3"]);
    expect(all.values).toEqual([100, 66.7, 0]);
    expect(all.ns).toEqual([3, 3, 1]);
  });

  it("cualquier intento: reconoce al que paso en el 2.o intento", () => {
    const chart = run(colorData(), {
      chart: "cs-pass-rate",
      options: '{"measure":"anyTry"}',
    });

    expect(seriesOf(chart).values).toEqual([100, 66.7, 100]);
  });
});

describe("Seriacion: tiempo por nivel", () => {
  it("mediana del primer intento, en segundos", () => {
    const chart = run(colorData(), { chart: "cs-time" });
    const all = seriesOf(chart);

    expect(chart.unit).toBe("seconds");
    // Nivel 1: 10, 14, 12 -> 12. Nivel 2: 20, 40, 22 -> 22. Nivel 3: solo el intento 1 (30, no 25).
    expect(all.values).toEqual([12, 22, 30]);
    expect(all.ns).toEqual([3, 3, 1]);
  });
});

function nodeData(): StatsData {
  const s1 = attempt("1", "node-connection", 1);
  const s2 = attempt("2", "node-connection", 1);

  return {
    students: [student("1"), student("2")],
    attempts: [s1, s2],
    results: [
      result(s1, "1", 1, 1, 5),
      result(s1, "2", 2, 1, 6),
      result(s1, "3", 3, 1, 7),
      result(s1, "4", 4, 1, 8),
      result(s2, "1", 1, 1, 7),
      result(s2, "2", 2, 1, 9),
    ],
    caseTitles: {},
  };
}

describe("Nodos", () => {
  it("niveles completados: el mas alto de cada estudiante", () => {
    const chart = run(nodeData(), { chart: "nc-levels" });

    expect(chart.categories).toEqual(["1", "2", "3", "4"]);
    expect(seriesOf(chart).values).toEqual([0, 1, 0, 1]);
  });

  it("tiempo por nivel: mediana entre estudiantes", () => {
    const chart = run(nodeData(), { chart: "nc-time" });

    expect(seriesOf(chart).values).toEqual([6, 7.5, 7, 8]);
  });
});

const R1 = "11111111-1";
const R2 = "22222222-2";
const R3 = "33333333-3";

function caseData(): StatsData {
  const s1 = attempt(R1, "mini-cases", 1);
  const s2 = attempt(R2, "mini-cases", 1);

  return {
    students: [student(R1), student(R2)],
    attempts: [s1, s2],
    results: [
      result(s1, "caso-a", 1, 1, 8, { correctSteps: 4, isFullyCorrect: true }),
      result(s1, "caso-b", 2, 1, 20, { correctSteps: 2, isFullyCorrect: false }),
      result(s2, "caso-a", 1, 1, 10, { correctSteps: 2, isFullyCorrect: false }),
      // s2 vio los casos en otro orden: el orden del grafico sigue el primero.
      result(s2, "caso-b", 2, 1, 12, { correctSteps: 3, isFullyCorrect: false }),
    ],
    caseTitles: { "caso-a": "El semáforo" },
  };
}

describe("Mini casos", () => {
  it("pasos correctos: promedio por caso, con el titulo del caso", () => {
    const chart = run(caseData(), { chart: "mc-steps" });

    expect(chart.categories).toEqual(["El semáforo", "caso-b"]);
    expect(seriesOf(chart).values).toEqual([3, 2.5]);
    expect(chart.unit).toBe("steps");
  });

  it("orden completo: porcentaje de estudiantes", () => {
    const chart = run(caseData(), { chart: "mc-steps", options: '{"measure":"full"}' });

    expect(seriesOf(chart).values).toEqual([50, 0]);
    expect(chart.unit).toBe("percent");
  });

  it("tiempo de decision: mediana por caso", () => {
    const chart = run(caseData(), { chart: "mc-time" });

    expect(seriesOf(chart).values).toEqual([9, 16]);
  });

  it("comparar por estudiante da una serie por estudiante, sin aviso de n bajo", () => {
    const chart = run(caseData(), {
      chart: "mc-steps",
      groupBy: "student",
      students: JSON.stringify([R1, R2, R3]),
    });

    expect(chart.series.map((s) => s.key)).toEqual([R1, R2, R3]);
    expect(seriesOf(chart, R1).values).toEqual([4, 2]);
    expect(seriesOf(chart, R2).values).toEqual([2, 3]);
    expect(seriesOf(chart, R3).values).toEqual([null, null]);
    expect(chart.warnings.join(" ")).toContain("Sin datos para");
  });
});

describe("Participacion", () => {
  function data(): StatsData {
    const students = [
      student("1", { paralelo: 1 }),
      student("2", { paralelo: 1 }),
      student("3", { paralelo: 2 }),
      student("4", { paralelo: 2 }),
      student("5", { paralelo: 2 }),
      student("6", { paralelo: 2, enabled: false }),
    ];

    const attempts = [
      attempt("1", "color-sequence", 1, { status: "finished" }),
      attempt("1", "color-sequence", 2, { status: "in_progress" }),
      attempt("2", "color-sequence", 1, { status: "failed" }),
      attempt("3", "color-sequence", 1, { status: "in_progress" }),
      attempt("1", "node-connection", 1),
      attempt("2", "node-connection", 1),
      attempt("6", "mini-cases", 1),
    ];

    return { students, attempts, results: [], caseTitles: {} };
  }

  it("porcentaje de estudiantes habilitados que comenzaron cada juego", () => {
    const chart = run(data(), { chart: "participation" });

    expect(chart.categories).toEqual([
      "Seriación de colores",
      "Conexión de nodos",
      "Mini casos",
    ]);
    // 5 habilitados: 3 jugaron seriacion, 2 nodos, 0 mini casos (el unico que jugo esta inhabilitado).
    expect(seriesOf(chart).values).toEqual([60, 40, 0]);
    expect(seriesOf(chart).n).toBe(5);
  });

  it("solo los que terminaron, y en cantidad", () => {
    const chart = run(data(), {
      chart: "participation",
      options: '{"measure":"finished","as":"count"}',
    });

    // Terminaron: s1 la seriacion y los dos de nodos (finished por defecto en el helper).
    expect(seriesOf(chart).values).toEqual([1, 2, 0]);
    expect(chart.unit).toBe("students");
  });

  it("compara por paralelo sobre el total de cada paralelo", () => {
    const chart = run(data(), { chart: "participation", groupBy: "paralelo" });

    expect(seriesOf(chart, "1").values).toEqual([100, 100, 0]);
    expect(seriesOf(chart, "2").values).toEqual([33.3, 0, 0]);
    expect(seriesOf(chart, "2").n).toBe(3);
  });
});

describe("Actividad en el tiempo", () => {
  function data(): StatsData {
    const s1 = attempt("1", "color-sequence", 1);
    const s2 = attempt("2", "node-connection", 1);

    return {
      students: [student("1"), student("2")],
      attempts: [s1, s2],
      results: [
        // 02:30 UTC del 19 es la noche del 18 en Chile.
        result(s1, "1", 1, 1, 5, {}, "2026-10-19T02:30:00Z"),
        result(s1, "2", 2, 1, 5, {}, "2026-10-20T15:00:00Z"),
        result(s1, "3", 3, 1, 5, {}, "2026-10-20T16:00:00Z"),
        result(s2, "1", 1, 1, 5, {}, "2026-10-20T16:00:00Z"),
      ],
      caseTitles: {},
    };
  }

  it("por dia: estudiantes distintos, con 0 en los dias sin actividad", () => {
    const chart = run(data(), { chart: "activity", options: '{"bucket":"day"}' });

    expect(chart.categories).toEqual(["18 oct", "19 oct", "20 oct", "21 oct"]);
    expect(seriesOf(chart).values).toEqual([1, 0, 2, 0]);
  });

  it("niveles o casos completados en vez de estudiantes", () => {
    const chart = run(data(), {
      chart: "activity",
      options: '{"bucket":"day","measure":"levels"}',
    });

    expect(seriesOf(chart).values).toEqual([1, 0, 3, 0]);
  });

  it("por semana: el domingo 18 cuenta en la semana del lunes 12", () => {
    const chart = run(data(), { chart: "activity", options: '{"bucket":"week"}' });

    expect(chart.categories).toEqual(["sem. 12 oct", "sem. 19 oct"]);
    expect(seriesOf(chart).values).toEqual([1, 2]);
  });

  it("puede limitarse a un juego", () => {
    const chart = run(data(), {
      chart: "activity",
      options: '{"bucket":"day","game":"node-connection"}',
    });

    expect(chart.categories).toEqual(["20 oct", "21 oct"]);
    expect(seriesOf(chart).values).toEqual([1, 0]);
  });
});

describe("Partidas abandonadas", () => {
  function data(): StatsData {
    return {
      students: [student("1"), student("2"), student("3")],
      attempts: [
        // 5 horas sin actividad: abandonada.
        attempt("1", "color-sequence", 1, {
          status: "in_progress",
          lastActivityAt: new Date("2026-10-21T10:00:00Z"),
        }),
        // 1 hora: sigue en curso.
        attempt("2", "color-sequence", 1, {
          status: "in_progress",
          lastActivityAt: new Date("2026-10-21T14:00:00Z"),
        }),
        // Terminada hace dias: no cuenta.
        attempt("3", "color-sequence", 1, {
          status: "finished",
          lastActivityAt: new Date("2026-10-15T14:00:00Z"),
        }),
        // Abandonada hace una semana, en otro juego.
        attempt("3", "mini-cases", 1, {
          status: "in_progress",
          lastActivityAt: new Date("2026-10-14T14:00:00Z"),
        }),
      ],
      results: [],
      caseTitles: {},
    };
  }

  it("cuenta solo las en curso con mas de 4 horas sin actividad", () => {
    const chart = run(data(), { chart: "abandonment", options: '{"bucket":"day"}' });

    expect(chart.categories[0]).toBe("14 oct");
    expect(chart.categories[chart.categories.length - 1]).toBe("21 oct");
    expect(seriesOf(chart).values.reduce((a, b) => (a ?? 0) + (b ?? 0), 0)).toBe(2);
    expect(seriesOf(chart).values[0]).toBe(1);
    expect(seriesOf(chart).values[7]).toBe(1);
  });

  it("limitado a un juego", () => {
    const chart = run(data(), {
      chart: "abandonment",
      options: '{"bucket":"day","game":"mini-cases"}',
    });

    expect(chart.categories).toEqual(["14 oct", "15 oct", "16 oct", "17 oct", "18 oct", "19 oct", "20 oct", "21 oct"]);
    expect(seriesOf(chart).values).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("una partida que se retoma deja de contarse", () => {
    const base = data();
    const resumed = {
      ...base,
      attempts: base.attempts.map((a) =>
        a.studentRut === "1" ? { ...a, lastActivityAt: new Date("2026-10-21T14:30:00Z") } : a,
      ),
    };

    const chart = run(resumed, { chart: "abandonment", options: '{"bucket":"day"}' });

    expect(seriesOf(chart).values.at(-1)).toBe(0);
  });
});

describe("catalogo de graficos", () => {
  it("cada grafico declara sus opciones con un valor por defecto valido", () => {
    for (const id of [
      "participation",
      "activity",
      "abandonment",
      "cs-max-level",
      "cs-pass-rate",
      "cs-time",
      "nc-levels",
      "nc-time",
      "mc-steps",
      "mc-time",
    ]) {
      const def = findChart(id);

      expect(def, id).toBeDefined();
      expect(def?.blurb.length, id).toBeGreaterThan(40);

      for (const option of def?.options ?? []) {
        expect(option.choices.map((c) => c.value), `${id}.${option.id}`).toContain(option.default);
      }
    }
  });
});
