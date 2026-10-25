import { describe, expect, it } from "vitest";

import { buildStudentProfile, parseStatesQuery } from "./studentProfile";
import type { AttemptRow, GameId, ResultRow, StatsData, StudentRow, UnlockRow } from "./types";

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
    startedAt: new Date(`2026-10-0${attemptNumber}T15:00:00Z`),
    lastActivityAt: new Date(`2026-10-0${attemptNumber}T16:00:00Z`),
    contentVersion: "x",
    student: null,
    ...extra,
  };
}

function level(
  owner: AttemptRow,
  n: number,
  passed = true,
  seconds = 10,
  metrics: Record<string, unknown> = {},
  tryNumber = 1,
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
    completedAt: new Date("2026-10-02T15:30:00Z"),
  };
}

/**
 * s1 (el estudiante): Seriacion en 2 partidas (llega al 3 y luego al 5, mas rapido),
 * Nodos en 1 partida con reinicios, sin Mini casos.
 * s2 a s4 (su paralelo): juegan Seriacion y Nodos.
 */
function data(): StatsData {
  const s1a = attempt("11111111", "color-sequence", 1);
  const s1b = attempt("11111111", "color-sequence", 2, { status: "failed" });
  const n1 = attempt("11111111", "node-connection", 1, { status: "in_progress", lastActivityAt: new Date("2026-10-20T09:00:00Z") });
  const others = ["22222222", "33333333", "44444444"].flatMap((rut, i) => [
    attempt(rut, "color-sequence", 1),
    attempt(rut, "node-connection", 1),
    { rut, level: i + 4 },
  ]);
  const otherAttempts = others.filter((x): x is AttemptRow => "attemptId" in x);
  const otherLevels = ["22222222", "33333333", "44444444"].flatMap((rut, i) => {
    const cs = otherAttempts.find((a) => a.studentRut === rut && a.gameId === "color-sequence") as AttemptRow;
    const nc = otherAttempts.find((a) => a.studentRut === rut && a.gameId === "node-connection") as AttemptRow;

    return [level(cs, i + 4, true, 20), level(nc, i + 2, true, 40)];
  });

  return {
    students: [student("11111111"), student("22222222"), student("33333333"), student("44444444"), student("55555555", { paralelo: 2 })],
    attempts: [s1a, s1b, n1, ...otherAttempts],
    results: [
      level(s1a, 1, true, 30, { swapErrors: 1, substitutionErrors: 0 }),
      level(s1a, 2, true, 40),
      level(s1a, 3, true, 50),
      level(s1b, 1, true, 10),
      level(s1b, 2, true, 12),
      level(s1b, 3, true, 14),
      level(s1b, 4, false, 20, { substitutionErrors: 2, firstErrorPosition: 2 }, 1),
      level(s1b, 4, true, 22, {}, 2),
      level(s1b, 5, true, 25),
      { ...level(n1, 1, true, 60), metrics: { undoCount: 2, resetCount: 1, routeRestarts: 3 } },
      { ...level(n1, 2, true, 80), metrics: { undoCount: 0, resetCount: 0, routeRestarts: 1 } },
      ...otherLevels,
    ],
    unlocks: [],
    caseTitles: {},
  };
}

describe("buildStudentProfile", () => {
  it("devuelve null si el estudiante no existe", () => {
    expect(buildStudentProfile("99999999", data(), NOW)).toBeNull();
  });

  it("trae quién es y su estado", () => {
    const profile = buildStudentProfile("11111111", data(), NOW);

    expect(profile?.student).toEqual({
      rut: "11111111",
      name: "Nombre11111111 Apellido11111111",
      paralelo: 1,
      university: "",
      shift: "",
      ciudad: "",
      enabled: true,
    });
  });

  it("un estudiante inhabilitado igual tiene ficha, marcada como inhabilitada", () => {
    const base = data();

    base.students[0] = { ...(base.students[0] as StudentRow), enabled: false };

    const profile = buildStudentProfile("11111111", base, NOW);

    expect(profile?.student.enabled).toBe(false);
    expect(profile?.games.find((g) => g.game === "color-sequence")?.charts.length).toBeGreaterThan(0);
  });

  describe("resumen", () => {
    const items = () => buildStudentProfile("11111111", data(), NOW)?.cards[0]?.items ?? [];
    const card = (label: string) => items().find((item) => item.label === label);

    it("cuenta sus partidas por juego y cómo terminaron", () => {
      expect(card("Partidas jugadas")).toMatchObject({
        value: "3",
        hint: "Seriación de colores 2 · Conexión de nodos 1 · Mini casos 0",
      });
    });

    it("terminadas, fallidas y sin terminar son tres cifras iguales, cada una con su desglose por juego", () => {
      expect(card("Terminadas")).toMatchObject({
        value: "1",
        hint: "Seriación de colores 1 · Conexión de nodos 0 · Mini casos 0",
      });
      expect(card("Fallidas")).toMatchObject({
        value: "1",
        hint: "Seriación de colores 1 · Conexión de nodos 0 · Mini casos 0",
      });
      expect(card("Sin terminar")).toMatchObject({
        value: "1",
        hint: "Seriación de colores 0 · Conexión de nodos 1 · Mini casos 0",
      });
      expect(card("Cómo terminaron")).toBeUndefined();
    });

    it("dice la primera partida y la última actividad", () => {
      expect(card("Primera partida")?.value).toMatch(/1 oct 2026/);
      expect(card("Última actividad")?.value).toMatch(/20 oct 2026/);
      expect(card("Última actividad")?.hint).toBe("Hace 1 día");
    });

    it("sin desbloquear: dice qué le falta; desbloqueado: cuándo", () => {
      expect(card("Mini casos")).toMatchObject({ value: "Sin desbloquear" });
      expect(card("Mini casos")?.hint).toMatch(/Le falta: Seriación: 5 niveles/);

      const base = data();
      const unlocks: UnlockRow[] = [{ studentRut: "11111111", gameId: "mini-cases", unlockedAt: new Date("2026-10-12T15:00:00Z") }];
      const unlocked = buildStudentProfile("11111111", { ...base, unlocks }, NOW)?.cards[0]?.items.find((i) => i.label === "Mini casos");

      expect(unlocked).toMatchObject({ value: "Desbloqueado" });
      expect(unlocked?.hint).toMatch(/12 oct 2026/);
    });

    it("el nivel máximo da su cifra, su promedio y mediana por partida, y el promedio y mediana de su paralelo", () => {
      // Su nivel: 5 (de la partida 2); por partida 3 y 5. Compañeros de paralelo 1: 4, 5 y 6.
      expect(card("Nivel máximo en Seriación")).toMatchObject({
        value: "5",
        hint: "Por partida: promedio 4 · mediana 4\nSu paralelo (3 estudiantes): promedio 5 · mediana 5",
      });
      // En Nodos: el suyo es 2; sus compañeros 2, 3, 4.
      expect(card("Nivel máximo en Nodos")).toMatchObject({
        value: "2",
        hint: "Por partida: promedio 2 · mediana 2\nSu paralelo (3 estudiantes): promedio 3 · mediana 3",
      });
    });

    it("el tiempo por nivel es el promedio de sus primeros intentos, con su mediana y la de su paralelo", () => {
      // Primeros intentos: 30, 40, 50, 10, 12, 14, 20, 25 s -> promedio 25,1; mediana 22,5. Su paralelo: todo 20 s.
      expect(card("Tiempo por nivel en Seriación (promedio)")).toMatchObject({
        value: "25,1 s",
        hint: "Mediana: 22,5 s\nSu paralelo (3 estudiantes): promedio 20 s · mediana 20 s",
      });
    });

    it("las notas del resumen dicen que sus cifras salen de su historial y que la comparación es solo ahí", () => {
      const notes = buildStudentProfile("11111111", data(), NOW)?.notes.join(" ") ?? "";

      expect(notes).toMatch(/solo de su propio historial/);
      expect(notes).toMatch(/única comparación/);
      expect(notes).toMatch(/Promedio.*Mediana/);
      expect(notes).not.toMatch(/habilitad/i);
    });

    it("con pocos compañeros se compara con todo el grupo y lo dice", () => {
      const base = data();

      base.students = base.students.map((s) => (s.rut === "44444444" ? { ...s, paralelo: 2 } : s));

      const hint = buildStudentProfile("11111111", base, NOW)?.cards[0]?.items.find((i) => i.label === "Nivel máximo en Seriación")?.hint;

      expect(hint).toMatch(/Todo el grupo \(4 estudiantes\)/);
    });

    it("un juego que no jugó dice «Sin partidas»", () => {
      const base = data();

      base.attempts = base.attempts.filter((a) => !(a.studentRut === "11111111" && a.gameId === "node-connection"));

      const nodes = buildStudentProfile("11111111", base, NOW)?.cards[0]?.items.find((i) => i.label === "Nivel máximo en Nodos");

      expect(nodes?.value).toBe("Sin partidas");
    });
  });

  describe("gráficos por juego", () => {
    const profile = () => buildStudentProfile("11111111", data(), NOW);
    const ids = (game: GameId) => profile()?.games.find((g) => g.game === game)?.charts.map((c) => c.id) ?? [];

    it("Seriación trae los gráficos del catálogo para este estudiante, más primera vs última partida", () => {
      expect(ids("color-sequence")).toEqual(["cs-improvement", "cs-time", "st-time", "cs-tries", "cs-error-type", "cs-first-error"]);
    });

    it("Nodos trae su mejora entre partidas, el tiempo y los reinicios; sin primera vs última si jugó una sola partida", () => {
      expect(ids("node-connection")).toEqual(["st-levels", "nc-time", "st-restarts"]);
    });

    it("un juego que no jugó no trae gráficos y se marca como no jugado", () => {
      const mini = profile()?.games.find((g) => g.game === "mini-cases");

      expect(mini).toMatchObject({ played: false, charts: [] });
    });

    it("cada gráfico trae su explicación", () => {
      for (const game of profile()?.games ?? []) {
        for (const chart of game.charts) expect(chart.description.length).toBeGreaterThan(20);
      }
    });

    it("«Empezó de nuevo» suma rehacer el tablero y rehacer rutas; «Deshacer» va aparte y la leyenda lo explica", () => {
      const chart = profile()?.games.find((g) => g.game === "node-connection")?.charts.find((c) => c.id === "st-restarts")?.result;

      expect(chart?.categories).toEqual(["Nivel 1", "Nivel 2"]);
      expect(chart?.series[0]?.values).toEqual([4, 1]);
      expect(chart?.series[1]?.values).toEqual([2, 0]);
      expect(chart?.series.map((series) => series.label)).toEqual(["Empezó de nuevo", "Corrigió con Deshacer"]);
      expect(chart?.legendNote).toMatch(/reinició el nivel o rehízo una ruta/);
      expect(chart?.legendNote).toMatch(/último movimiento/);
    });

    it("los reinicios no usan la unidad de pasos: su eje no tiene tope de 4 y no recorta valores altos", () => {
      const chart = profile()?.games.find((g) => g.game === "node-connection")?.charts.find((c) => c.id === "st-restarts")?.result;

      expect(chart?.unit).toBe("count");
    });

    it("primera vs última partida compara nivel a nivel, solo con los niveles que jugó en las dos", () => {
      const chart = profile()?.games.find((g) => g.game === "color-sequence")?.charts.find((c) => c.id === "st-time")?.result;

      // Partida 1: niveles 1 a 3 (30, 40, 50 s). Partida 2: niveles 1 a 5 (10, 12, 14, 20, 25 s). En común: 1 a 3.
      expect(chart?.categories).toEqual(["Nivel 1", "Nivel 2", "Nivel 3"]);
      expect(chart?.series.map((series) => series.values)).toEqual([
        [30, 40, 50],
        [10, 12, 14],
      ]);
      expect(chart?.series.map((series) => series.label)).toEqual(["Primera: partida 1", "Última: partida 2"]);
      expect(chart?.basis).toBe("Compara la partida 1 con la partida 2, en los 3 niveles que jugó en ambas.");
    });

    it("sin dos partidas con tiempos no hay primera vs última", () => {
      expect(ids("node-connection")).not.toContain("st-time");
    });

    it("la mejora de Nodos da el nivel más alto completado en cada partida", () => {
      const chart = profile()?.games.find((g) => g.game === "node-connection")?.charts.find((c) => c.id === "st-levels")?.result;

      expect(chart?.categories).toEqual(["1"]);
      expect(chart?.series[0]?.values).toEqual([2]);
      expect(chart?.xLabel).toBe("Partida (1 = la primera que jugó)");
    });

    it("las notas hablan de un estudiante: no dicen «cada uno cuenta una sola vez»", () => {
      for (const game of profile()?.games ?? []) {
        for (const chart of game.charts) {
          expect(chart.result.notes.join(" "), chart.id).not.toMatch(/cada uno cuenta una sola vez|cada estudiante/i);
        }
      }

      const time = profile()?.games.find((g) => g.game === "color-sequence")?.charts.find((c) => c.id === "cs-time")?.result;

      expect(time?.notes).toContain("Se usan todas sus partidas.");
      expect(time?.notes).toContain("En cada nivel se toma la mediana de sus tiempos entre las partidas que lo jugaron.");
    });

    it("«Dónde fallan primero» usa tramos que se entienden y los repartos suman exactamente 100", () => {
      const charts = profile()?.games.find((g) => g.game === "color-sequence")?.charts ?? [];
      const first = charts.find((c) => c.id === "cs-first-error")?.result;

      expect(first?.categories).toEqual(["1.ª parte (inicio)", "2.ª parte", "3.ª parte (centro)", "4.ª parte", "5.ª parte (final)"]);
      expect(charts.find((c) => c.id === "cs-first-error")?.description).toMatch(/5 partes iguales/);

      for (const id of ["cs-tries", "cs-error-type", "cs-first-error"] as const) {
        const result = charts.find((c) => c.id === id)?.result;
        const total = (result?.series[0]?.values ?? []).reduce<number>((sum, value) => sum + (value ?? 0), 0);

        expect(Math.round(total * 10) / 10, id).toBe(100);
      }
    });

    it("cada gráfico dice con cuántas partidas se calculó", () => {
      const basis = Object.fromEntries(
        (profile()?.games ?? []).flatMap((g) => g.charts.map((c) => [c.id, c.result.basis] as const)),
      );

      expect(basis["cs-improvement"]).toBe("Calculado con sus 2 partidas.");
      expect(basis["cs-time"]).toBe("Calculado con sus 2 partidas, en el primer intento de cada nivel.");
      expect(basis["nc-time"]).toBe("Calculado con su única partida.");
      expect(basis["st-restarts"]).toBe("Suma de su única partida.");
      // Repartos: la cantidad real detrás de los porcentajes.
      expect(basis["cs-tries"]).toMatch(/^Calculado con \d+ niveles jugados en sus 2 partidas\.$/);
      expect(basis["cs-first-error"]).toMatch(/^Calculado con \d+ respuestas con error en sus 2 partidas\.$/);
    });

    it("la mejora entre partidas no se corta en 20: entran todas sus partidas", () => {
      const base = data();
      const many = Array.from({ length: 25 }, (_, i) => attempt("11111111", "color-sequence", i + 3, { startedAt: new Date(`2026-09-${String((i % 28) + 1).padStart(2, "0")}T15:00:00Z`) }));

      base.attempts = [...base.attempts, ...many];
      base.results = [...base.results, ...many.map((a) => level(a, 2, true, 10))];

      const chart = buildStudentProfile("11111111", base, NOW)
        ?.games.find((g) => g.game === "color-sequence")
        ?.charts.find((c) => c.id === "cs-improvement")?.result;

      expect(chart?.categories).toHaveLength(27);
      expect(chart?.categories.at(-1)).toBe("27");
    });

    it("la evolución del nivel muestra su nivel en cada partida", () => {
      const chart = profile()?.games.find((g) => g.game === "color-sequence")?.charts.find((c) => c.id === "cs-improvement")?.result;

      expect(chart?.series).toHaveLength(1);
      expect(chart?.series[0]?.label).toBe("Nivel más alto superado");
      expect(chart?.series[0]?.values).toEqual([3, 5]);
    });
  });

  describe("partidas que entran en los gráficos", () => {
    const seriation = (options?: Parameters<typeof buildStudentProfile>[3]) =>
      buildStudentProfile("11111111", data(), NOW, options)?.games.find((g) => g.game === "color-sequence");

    it("por defecto entran todas: terminadas, fallidas y sin terminar", () => {
      expect(seriation()?.breakdown).toEqual({
        total: 2,
        finished: 1,
        failed: 1,
        open: 0,
        states: ["finished", "failed", "open"],
        selected: 2,
        withData: 2,
      });
    });

    it("un gráfico no deja fuera partidas fallidas: la mejora entre partidas incluye la fallida", () => {
      const chart = seriation()?.charts.find((c) => c.id === "cs-improvement")?.result;

      expect(chart?.series[0]?.values).toEqual([3, 5]);
    });

    it("si se eligen solo las terminadas, los gráficos se calculan solo con ellas y lo dicen", () => {
      const only = seriation({ states: { "color-sequence": ["finished"] } });
      const chart = only?.charts.find((c) => c.id === "cs-improvement")?.result;

      expect(only?.breakdown).toMatchObject({ selected: 1, withData: 1, states: ["finished"] });
      expect(chart?.series[0]?.values).toEqual([3]);
      expect(chart?.basis).toBe("Calculado con su única partida terminada.");
      expect(chart?.notes).toContain("Se usan solo sus partidas terminadas de Seriación de colores.");
    });

    it("elegir estados de un juego no cambia los otros", () => {
      const nodes = buildStudentProfile("11111111", data(), NOW, { states: { "color-sequence": ["failed"] } })?.games.find(
        (g) => g.game === "node-connection",
      );

      expect(nodes?.breakdown.states).toEqual(["finished", "failed", "open"]);
      expect(nodes?.charts.length).toBeGreaterThan(0);
    });

    it("el resumen no cambia con el filtro: cuenta siempre todas sus partidas", () => {
      const filtered = buildStudentProfile("11111111", data(), NOW, { states: { "color-sequence": ["finished"] } });
      const all = buildStudentProfile("11111111", data(), NOW);

      expect(filtered?.cards).toEqual(all?.cards);
    });

    it("estados sin ninguna partida dejan el juego sin gráficos", () => {
      const only = seriation({ states: { "color-sequence": ["open"] } });

      expect(only?.charts).toEqual([]);
      expect(only?.breakdown).toMatchObject({ selected: 0, withData: 0 });
    });

    it("las partidas sin ningún resultado guardado se cuentan aparte y se explican", () => {
      const base = data();
      const empty = attempt("11111111", "color-sequence", 3, { status: "in_progress" });

      base.attempts = [...base.attempts, empty];

      const game = buildStudentProfile("11111111", base, NOW)?.games.find((g) => g.game === "color-sequence");
      const chart = game?.charts.find((c) => c.id === "cs-improvement")?.result;

      expect(game?.breakdown).toMatchObject({ total: 3, open: 1, selected: 3, withData: 2 });
      expect(chart?.notes.join(" ")).toMatch(/Entran 2 de sus 3 partidas: 1 no guardó ningún nivel o caso/);
    });
  });

  describe("leyenda de deducción y notas de un estudiante", () => {
    const charts = () => buildStudentProfile("11111111", data(), NOW)?.games.flatMap((g) => g.charts) ?? [];

    it("cada gráfico trae su leyenda de deducción", () => {
      for (const chart of charts()) {
        expect(chart.result.deduction?.length ?? 0, chart.id).toBeGreaterThan(30);
      }
    });

    it("ningún gráfico habla de estudiantes habilitados ni compara con el paralelo", () => {
      for (const chart of charts()) {
        const text = [...chart.result.notes, chart.result.basis ?? "", chart.description, chart.result.deduction ?? ""].join(" ");

        expect(text, chart.id).not.toMatch(/habilitad|paralelo/i);
      }
    });

    it("un estudiante inhabilitado no muestra frases sobre habilitados", () => {
      const base = data();

      base.students[0] = { ...(base.students[0] as StudentRow), enabled: false };

      for (const chart of buildStudentProfile("11111111", base, NOW)?.games.flatMap((g) => g.charts) ?? []) {
        expect(chart.result.notes.join(" "), chart.id).not.toMatch(/habilitad/i);
      }
    });
  });

  it("no mezcla a otros estudiantes en sus gráficos", () => {
    const profile = buildStudentProfile("11111111", data(), NOW);
    const chart = profile?.games.find((g) => g.game === "color-sequence")?.charts.find((c) => c.id === "cs-tries")?.result;

    expect(chart?.series).toHaveLength(1);
    expect(chart?.studentsTotal).toBe(1);
  });
});

describe("parseStatesQuery", () => {
  it("sin nada pedido, entran todas", () => {
    expect(parseStatesQuery({})).toEqual({ ok: true, states: {} });
  });

  it("lee los estados de cada juego", () => {
    expect(parseStatesQuery({ "color-sequence": "finished,failed", "mini-cases": "open" })).toEqual({
      ok: true,
      states: { "color-sequence": ["finished", "failed"], "mini-cases": ["open"] },
    });
  });

  it("rechaza un estado que no existe", () => {
    expect(parseStatesQuery({ "color-sequence": "abandoned" }).ok).toBe(false);
  });
});
