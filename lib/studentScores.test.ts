import { describe, expect, it } from "vitest";

import {
  buildStudentScores,
  rankFor,
  type ScoreAttempt,
  type ScoreResult,
} from "./studentScores";

const attempt = (
  attemptId: string,
  gameId: ScoreAttempt["gameId"],
  attemptNumber: number,
  status = "finished",
): ScoreAttempt => ({ attemptId, gameId, attemptNumber, status });

const color = (
  attemptId: string,
  index: number,
  tryNumber: number,
  correctCount: number,
  passed: boolean,
): ScoreResult => ({
  attemptId,
  gameId: "color-sequence",
  key: tryNumber === 1 ? String(index) : `${index}.${tryNumber}`,
  index,
  tryNumber,
  metrics: { sequenceLength: index + 1, correctCount, passed },
});

const node = (
  attemptId: string,
  index: number,
  tryNumber: number,
  errors: number,
  errorsAllowed: number,
  passed: boolean,
): ScoreResult => ({
  attemptId,
  gameId: "node-connection",
  key: tryNumber === 1 ? String(index) : `${index}.${tryNumber}`,
  index,
  tryNumber,
  metrics: { errors, errorsAllowed, passed },
});

const miniCase = (
  attemptId: string,
  caseKey: string,
  correctSteps: number,
  isFullyCorrect: boolean,
): ScoreResult => ({
  attemptId,
  gameId: "mini-cases",
  key: caseKey,
  index: 1,
  tryNumber: 1,
  metrics: { correctSteps, isFullyCorrect },
});

describe("rankFor", () => {
  it("empieza en el primer rango y muestra cuanto falta para el siguiente", () => {
    const rank = rankFor(0);

    expect(rank.name).toBe("Chispa");
    expect(rank.next?.name).toBe("Destello");
    expect(rank.pointsToNext).toBe(100);
    expect(rank.progressPercent).toBe(0);
  });

  it("sube justo al llegar al minimo y avanza dentro del rango", () => {
    expect(rankFor(100).name).toBe("Destello");
    expect(rankFor(99).name).toBe("Chispa");
    expect(rankFor(200).progressPercent).toBe(50);
  });

  it("el ultimo rango no tiene siguiente", () => {
    const rank = rankFor(9999);

    expect(rank.name).toBe("Constelación");
    expect(rank.next).toBeNull();
    expect(rank.progressPercent).toBe(100);
  });
});

describe("buildStudentScores", () => {
  it("sin partidas no hay puntos y la escalera esta vacia", () => {
    const scores = buildStudentScores({ attempts: [], results: [] });

    expect(scores.hasPlayed).toBe(false);
    expect(scores.totalPoints).toBe(0);
    expect(scores.colorSequence.ladder).toHaveLength(10);
    expect(scores.nodes.ladder).toHaveLength(15);
    expect(scores.nodes.ladder.every((l) => l.state === "pending")).toBe(true);
    // Sin empezar, la primera meta es la mas sencilla: pasar un nivel.
    expect(scores.nextGoal?.id).toBe("first-step");
  });

  it("nivel de seriacion: 10 por pasarlo, 5 al primer intento y 5 si acerto todo", () => {
    const scores = buildStudentScores({
      attempts: [attempt("a", "color-sequence", 1)],
      results: [color("a", 1, 1, 2, true), color("a", 2, 1, 3, true)],
    });

    // nivel 1: 2/2 perfecto y primer intento = 20; nivel 2: 3/3 = 20.
    expect(scores.totalPoints).toBe(40);

    const second = buildStudentScores({
      attempts: [attempt("a", "color-sequence", 1)],
      results: [color("a", 3, 1, 3, true)],
    });

    // 3/4 pasa por umbral pero no es perfecto: 10 + 5.
    expect(second.totalPoints).toBe(15);
  });

  it("un nivel pasado en el segundo intento no suma el bonus de primer intento", () => {
    const scores = buildStudentScores({
      attempts: [attempt("a", "color-sequence", 1)],
      results: [color("a", 4, 1, 1, false), color("a", 4, 2, 5, true)],
    });

    const level4 = scores.colorSequence.ladder[3]!;

    expect(level4.state).toBe("retry");
    expect(level4.points).toBe(15); // pasar + sin fallar, sin primer intento
    expect(scores.badges.find((b) => b.id === "comeback")?.current).toBe(1);
  });

  it("un nivel solo fallado se ve como alcanzado y no da puntos", () => {
    const scores = buildStudentScores({
      attempts: [attempt("a", "color-sequence", 1, "failed")],
      results: [color("a", 3, 1, 1, false)],
    });

    expect(scores.colorSequence.ladder[2]).toMatchObject({ state: "reached", points: 0 });
    expect(scores.totalPoints).toBe(0);
    expect(scores.colorSequence.bestLevel).toBe(0);
  });

  it("repetir un nivel en otra partida no suma dos veces: se cuenta lo mejor", () => {
    const once = buildStudentScores({
      attempts: [attempt("a", "color-sequence", 1)],
      results: [color("a", 1, 1, 2, true)],
    });
    const twice = buildStudentScores({
      attempts: [attempt("a", "color-sequence", 1), attempt("b", "color-sequence", 2)],
      results: [color("a", 1, 1, 2, true), color("b", 1, 1, 2, true)],
    });

    expect(twice.totalPoints).toBe(once.totalPoints);
  });

  it("los puntos no bajan si una partida posterior sale peor", () => {
    const good = [color("a", 1, 1, 2, true)];
    const before = buildStudentScores({ attempts: [attempt("a", "color-sequence", 1)], results: good });
    const after = buildStudentScores({
      attempts: [attempt("a", "color-sequence", 1), attempt("b", "color-sequence", 2, "failed")],
      results: [...good, color("b", 1, 1, 0, false)],
    });

    expect(after.totalPoints).toBeGreaterThanOrEqual(before.totalPoints);
  });

  it("la escalera de seriacion crece mas alla de los 10 niveles obligatorios", () => {
    const scores = buildStudentScores({
      attempts: [attempt("a", "color-sequence", 1)],
      results: [color("a", 12, 1, 13, true)],
    });

    expect(scores.colorSequence.ladder).toHaveLength(12);
    expect(scores.colorSequence.bestLevel).toBe(12);
  });

  it("nodos: tablero sin errores es 'limpio' y deja un margen del 100%", () => {
    const scores = buildStudentScores({
      attempts: [attempt("n", "node-connection", 1)],
      results: [node("n", 1, 1, 0, 6, true), node("n", 2, 1, 3, 6, true)],
    });

    expect(scores.nodes.ladder[0]!.points).toBe(20);
    expect(scores.nodes.ladder[1]!.points).toBe(15);
    expect(scores.nodes.margins).toEqual([
      { level: 1, marginPercent: 100 },
      { level: 2, marginPercent: 50 },
    ]);
    expect(scores.stats.flawlessLevels).toBe(1);
  });

  it("nodos: un intento perdido no aparece en el margen ni da puntos", () => {
    const scores = buildStudentScores({
      attempts: [attempt("n", "node-connection", 1)],
      results: [node("n", 1, 1, 9, 6, false)],
    });

    expect(scores.nodes.margins).toEqual([]);
    expect(scores.totalPoints).toBe(0);
  });

  it("nodos guardados antes de los errores permitidos cuentan como pasados, sin bonus de tablero limpio", () => {
    const scores = buildStudentScores({
      attempts: [attempt("n", "node-connection", 1)],
      results: [
        { attemptId: "n", gameId: "node-connection", key: "1", index: 1, tryNumber: 1, metrics: {} },
      ],
    });

    expect(scores.nodes.ladder[0]).toMatchObject({ state: "first-try", points: 15 });
    expect(scores.nodes.margins).toEqual([]);
  });

  it("mini casos: 3 por paso y 8 de bonus por el orden completo; se guarda lo mejor", () => {
    const scores = buildStudentScores({
      attempts: [attempt("m1", "mini-cases", 1), attempt("m2", "mini-cases", 2)],
      results: [
        miniCase("m1", "c1", 2, false),
        miniCase("m2", "c1", 4, true),
        miniCase("m1", "c2", 3, false),
      ],
    });

    expect(scores.miniCases.cases).toEqual([
      { caseKey: "c1", played: true, steps: 4, complete: true },
      { caseKey: "c2", played: true, steps: 3, complete: false },
    ]);
    expect(scores.pointsByGame.find((g) => g.gameId === "mini-cases")?.points).toBe(
      4 * 3 + 8 + 3 * 3,
    );
  });

  it("marca nueva: solo cuando una partida supera a todas las anteriores", () => {
    const scores = buildStudentScores({
      attempts: [
        attempt("a", "color-sequence", 1),
        attempt("b", "color-sequence", 2),
        attempt("c", "color-sequence", 3),
      ],
      results: [
        color("a", 3, 1, 4, true),
        color("b", 2, 1, 3, true),
        color("c", 5, 1, 6, true),
      ],
    });

    expect(scores.colorSequence.attempts).toEqual([
      { attemptNumber: 1, bestLevel: 3, isRecord: false },
      { attemptNumber: 2, bestLevel: 2, isRecord: false },
      { attemptNumber: 3, bestLevel: 5, isRecord: true },
    ]);
    expect(scores.badges.find((b) => b.id === "new-record")?.earned).toBe(true);
  });

  it("solo se grafican las ultimas 8 partidas", () => {
    const attempts = Array.from({ length: 10 }, (_, i) => attempt(`a${i}`, "color-sequence", i + 1));
    const scores = buildStudentScores({
      attempts,
      results: attempts.map((a, i) => color(a.attemptId, 1 + (i % 3), 1, 4, true)),
    });

    expect(scores.colorSequence.attempts).toHaveLength(8);
    expect(scores.colorSequence.attempts[0]!.attemptNumber).toBe(3);
  });

  it("las insignias muestran avance y la proxima meta es la mas cercana", () => {
    const scores = buildStudentScores({
      attempts: [attempt("a", "color-sequence", 1)],
      results: [1, 2, 3, 4].map((l) => color("a", l, 1, l + 1, true)),
    });

    const memory5 = scores.badges.find((b) => b.id === "memory-5")!;

    expect(memory5).toMatchObject({ current: 4, goal: 5, earned: false });
    expect(scores.badges.find((b) => b.id === "first-step")?.earned).toBe(true);
    expect(scores.nextGoal?.id).toBe("memory-5");
    expect(scores.nextGoal?.earned).toBe(false);
  });

  it("ninguna insignia pasa de su meta", () => {
    const scores = buildStudentScores({
      attempts: [attempt("a", "color-sequence", 1)],
      results: Array.from({ length: 14 }, (_, i) => color("a", i + 1, 1, i + 2, true)),
    });

    for (const b of scores.badges) expect(b.current).toBeLessThanOrEqual(b.goal);
  });

  it("mini casos: se listan TODOS los casos del banco y los sin jugar quedan pendientes, no en 4/4", () => {
    const scores = buildStudentScores({
      attempts: [attempt("m1", "mini-cases", 1, "in_progress")],
      results: [miniCase("m1", "caso-2", 4, true), miniCase("m1", "caso-10", 4, true)],
      caseKeys: ["caso-2", "caso-10", "caso-11", "caso-12"],
    });

    expect(scores.miniCases.total).toBe(4);
    expect(scores.miniCases.played).toBe(2);
    expect(scores.miniCases.cases.map((c) => [c.caseKey, c.played, c.steps])).toEqual([
      ["caso-2", true, 4],
      ["caso-10", true, 4],
      ["caso-11", false, 0],
      ["caso-12", false, 0],
    ]);
    // Quien respondio 2 de 4 casos no tiene el banco perfecto ni lo exploro completo.
    expect(scores.badges.find((b) => b.id === "full-bank-perfect")).toMatchObject({ current: 2, goal: 4, earned: false });
    expect(scores.badges.find((b) => b.id === "cases-explorer")).toMatchObject({ current: 2, goal: 4, earned: false });
  });

  it("un caso jugado que ya no esta en el banco igual se cuenta", () => {
    const scores = buildStudentScores({
      attempts: [attempt("m1", "mini-cases", 1)],
      results: [miniCase("m1", "viejo", 3, false)],
      caseKeys: ["nuevo"],
    });

    expect(scores.miniCases.cases.map((c) => c.caseKey)).toEqual(["nuevo", "viejo"]);
    expect(scores.pointsByGame.find((g) => g.gameId === "mini-cases")?.points).toBe(9);
  });

  it("partida impecable: 10 o mas niveles, todos a la primera y ninguno perdido", () => {
    const ten = Array.from({ length: 10 }, (_, i) => color("a", i + 1, 1, i + 2, true));
    const clean = buildStudentScores({ attempts: [attempt("a", "color-sequence", 1)], results: ten });

    expect(clean.badges.find((b) => b.id === "flawless-run")?.earned).toBe(true);

    // Un solo intento perdido en la partida la deja de ser impecable.
    const withRetry = buildStudentScores({
      attempts: [attempt("a", "color-sequence", 1)],
      results: [...ten.slice(0, 9), color("a", 10, 1, 1, false), color("a", 10, 2, 11, true)],
    });

    expect(withRetry.badges.find((b) => b.id === "flawless-run")?.current).toBe(0);

    // Nueve niveles no alcanzan.
    const nine = buildStudentScores({ attempts: [attempt("a", "color-sequence", 1)], results: ten.slice(0, 9) });

    expect(nine.badges.find((b) => b.id === "flawless-run")?.earned).toBe(false);
  });

  it("dias jugados: se cuentan en hora de Chile y por dia distinto", () => {
    const at = (iso: string, base: ScoreResult): ScoreResult => ({ ...base, completedAt: iso });
    const scores = buildStudentScores({
      attempts: [attempt("a", "color-sequence", 1)],
      results: [
        at("2026-10-20T15:00:00Z", color("a", 1, 1, 2, true)),
        // 01:30 UTC del 21 es todavia el 20 en Chile (UTC-3): mismo dia.
        at("2026-10-21T01:30:00Z", color("a", 2, 1, 3, true)),
        at("2026-10-22T15:00:00Z", color("a", 3, 1, 4, true)),
      ],
    });

    expect(scores.badges.find((b) => b.id === "days-2")?.current).toBe(2);
    expect(scores.badges.find((b) => b.id === "days-2")?.earned).toBe(true);
    expect(scores.badges.find((b) => b.id === "days-5")?.earned).toBe(false);
  });

  it("un estudiante nuevo que pasa 10 niveles de seriacion y los 15 de nodos sin fallar no se lleva la mitad de las insignias", () => {
    const results = [
      ...Array.from({ length: 10 }, (_, i) => color("c", i + 1, 1, i + 2, true)),
      ...Array.from({ length: 15 }, (_, i) => node("n", i + 1, 1, 0, 4, true)),
    ].map((r) => ({ ...r, completedAt: "2026-10-20T15:00:00Z" }));
    const scores = buildStudentScores({
      attempts: [attempt("c", "color-sequence", 1), attempt("n", "node-connection", 1)],
      results,
      caseKeys: Array.from({ length: 10 }, (_, i) => `caso-${i + 1}`),
    });
    const earned = scores.badges.filter((b) => b.earned).length;

    // Antes eran 18 de 34 en una sola sesion. Una sesion perfecta sigue premiandose, pero no tanto.
    expect(earned).toBeLessThanOrEqual(13);
    expect(earned).toBeGreaterThanOrEqual(8);
    expect(scores.rank.name).not.toBe("Constelación");
    expect(scores.ranks.map((r) => r.name)).toEqual(["Chispa", "Destello", "Llama", "Estrella", "Constelación"]);
  });

  it("margen de oro: solo cuenta conservar MAS de la mitad del margen", () => {
    const scores = buildStudentScores({
      attempts: [attempt("n", "node-connection", 1)],
      results: [
        node("n", 1, 1, 3, 6, true), // sobra 50 %: no cuenta
        node("n", 2, 1, 2, 6, true), // sobra 67 %: cuenta
        node("n", 3, 1, 0, 6, true), // sobra 100 %: cuenta
      ],
    });

    expect(scores.badges.find((b) => b.id === "margin-gold")?.current).toBe(2);
  });
});
