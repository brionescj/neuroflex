import { describe, expect, it } from "vitest";

import { buildStudentProfile } from "./studentProfile";
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
      expect(card("Cómo terminaron")).toMatchObject({ value: "1 terminadas", hint: "1 fallidas · 1 sin terminar" });
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

    it("el nivel máximo se compara con la mediana de su paralelo", () => {
      // Su nivel: 5 (de la partida 2). Compañeros de paralelo 1: 4, 5, 6 -> mediana 5.
      expect(card("Nivel máximo en Seriación")).toMatchObject({
        value: "5",
        hint: "Mediana de su paralelo (3 estudiantes): 5",
      });
      // En Nodos: el suyo es 2; sus compañeros 2, 3, 4 -> 3.
      expect(card("Nivel máximo en Nodos")).toMatchObject({ value: "2", hint: "Mediana de su paralelo (3 estudiantes): 3" });
    });

    it("con pocos compañeros se compara con todo el grupo y lo dice", () => {
      const base = data();

      base.students = base.students.map((s) => (s.rut === "44444444" ? { ...s, paralelo: 2 } : s));

      const hint = buildStudentProfile("11111111", base, NOW)?.cards[0]?.items.find((i) => i.label === "Nivel máximo en Seriación")?.hint;

      expect(hint).toMatch(/todo el grupo \(4 estudiantes\)/);
    });

    it("un juego que no jugó dice «Sin partidas»", () => {
      const base = data();

      base.attempts = base.attempts.filter((a) => !(a.studentRut === "11111111" && a.gameId === "node-connection"));

      const nodes = buildStudentProfile("11111111", base, NOW)?.cards[0]?.items.find((i) => i.label === "Nivel máximo en Nodos");

      expect(nodes?.value).toBe("Sin partidas");
    });
  });

  describe("historial", () => {
    it("lista cada partida, la más reciente primero, con su estado", () => {
      const history = buildStudentProfile("11111111", data(), NOW)?.history;

      expect(history?.columns[0]).toBe("Juego");
      expect(history?.rows).toHaveLength(3);
      // El orden lo da la fecha de inicio: la partida 2 de Seriación (2 oct), la 1 de ambos juegos (1 oct).
      expect(history?.rows.map((row) => `${row[0]} ${row[1]} ${row[3]}`)[0]).toBe("Seriación de colores 2 Fallida");
      expect(history?.rows.map((row) => `${row[0]} ${row[1]} ${row[3]}`)).toEqual(
        expect.arrayContaining(["Seriación de colores 1 Terminada", "Conexión de nodos 1 Abandonada"]),
      );
    });

    it("trae el mejor nivel y el tiempo activo de cada partida", () => {
      const rows = buildStudentProfile("11111111", data(), NOW)?.history.rows ?? [];
      const second = rows.find((row) => row[0] === "Seriación de colores" && row[1] === 2);

      // Niveles 1 a 5 aprobados; 10+12+14+20+22+25 s = 103 s = 1,7 min.
      expect(second?.[5]).toBe(5);
      expect(second?.[6]).toBe(1.7);
    });
  });

  describe("gráficos por juego", () => {
    const profile = () => buildStudentProfile("11111111", data(), NOW);
    const ids = (game: GameId) => profile()?.games.find((g) => g.game === game)?.charts.map((c) => c.id) ?? [];

    it("Seriación trae los gráficos del catálogo para este estudiante, más su tiempo por partida", () => {
      expect(ids("color-sequence")).toEqual(expect.arrayContaining(["cs-improvement", "cs-time", "cs-tries", "st-time"]));
    });

    it("Nodos trae sus gráficos y las veces que volvió a empezar", () => {
      expect(ids("node-connection")).toEqual(expect.arrayContaining(["nc-levels", "nc-time", "st-restarts"]));
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

    it("«Volvió a empezar» suma rehacer el tablero y rehacer rutas; «Deshacer» va aparte", () => {
      const chart = profile()?.games.find((g) => g.game === "node-connection")?.charts.find((c) => c.id === "st-restarts")?.result;

      expect(chart?.categories).toEqual(["Nivel 1", "Nivel 2"]);
      expect(chart?.series[0]?.values).toEqual([4, 1]);
      expect(chart?.series[1]?.values).toEqual([2, 0]);
    });

    it("los reinicios no usan la unidad de pasos: su eje no tiene tope de 4 y no recorta valores altos", () => {
      const chart = profile()?.games.find((g) => g.game === "node-connection")?.charts.find((c) => c.id === "st-restarts")?.result;

      expect(chart?.unit).toBe("count");
    });

    it("el tiempo por partida es la mediana del primer intento de cada nivel", () => {
      const chart = profile()?.games.find((g) => g.game === "color-sequence")?.charts.find((c) => c.id === "st-time")?.result;

      expect(chart?.categories).toEqual(["Partida 1", "Partida 2"]);
      // Partida 1: 30, 40, 50 -> 40. Partida 2: 10, 12, 14, 20 (primer intento del 4), 25 -> 14.
      expect(chart?.series[0]?.values).toEqual([40, 14]);
    });

    it("la evolución del nivel muestra su nivel en cada partida", () => {
      const chart = profile()?.games.find((g) => g.game === "color-sequence")?.charts.find((c) => c.id === "cs-improvement")?.result;

      expect(chart?.series).toHaveLength(1);
      expect(chart?.series[0]?.label).toBe("Nombre11111111 Apellido11111111");
      expect(chart?.series[0]?.values).toEqual([3, 5]);
    });
  });

  it("no mezcla a otros estudiantes en sus gráficos", () => {
    const profile = buildStudentProfile("11111111", data(), NOW);
    const chart = profile?.games.find((g) => g.game === "color-sequence")?.charts.find((c) => c.id === "cs-tries")?.result;

    expect(chart?.series).toHaveLength(1);
    expect(chart?.studentsTotal).toBe(1);
  });
});
