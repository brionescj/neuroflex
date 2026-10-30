import { describe, expect, it } from "vitest";

import { BADGE_COUNT, buildBadges, type BadgeFacts } from "./studentBadges";

const NONE: BadgeFacts = {
  totalPoints: 0,
  levelsPassed: 0,
  firstTryLevels: 0,
  flawlessSeriation: 0,
  flawlessNodes: 0,
  wideMarginNodes: 0,
  seriationBest: 0,
  nodesBest: 0,
  gamesPlayed: 0,
  finishedAttempts: 0,
  comebacks: 0,
  records: 0,
  flawlessRuns: 0,
  daysPlayed: 0,
  perfectCases: 0,
  playedCases: 0,
  totalCases: 12,
  caseSteps: 0,
  caseRuns: 0,
};

const EVERYTHING: BadgeFacts = {
  totalPoints: 5000,
  levelsPassed: 99,
  firstTryLevels: 99,
  flawlessSeriation: 99,
  flawlessNodes: 99,
  wideMarginNodes: 99,
  seriationBest: 99,
  nodesBest: 99,
  gamesPlayed: 3,
  finishedAttempts: 99,
  comebacks: 99,
  records: 99,
  flawlessRuns: 99,
  daysPlayed: 99,
  perfectCases: 12,
  playedCases: 12,
  totalCases: 12,
  caseSteps: 99,
  caseRuns: 99,
};

const ids = (facts: BadgeFacts) => buildBadges(facts).map((b) => b.id);
const earned = (facts: BadgeFacts) => buildBadges(facts).filter((b) => b.earned).map((b) => b.id);

describe("insignias", () => {
  it("hay 47, con id unico y sin ninguna ganada al empezar", () => {
    const badges = buildBadges(NONE);

    expect(badges).toHaveLength(BADGE_COUNT);
    expect(BADGE_COUNT).toBe(47);
    expect(new Set(ids(NONE)).size).toBe(BADGE_COUNT);
    expect(earned(NONE)).toEqual([]);
  });

  it("van de la mas facil a la mas dificil y todos los niveles tienen insignias", () => {
    const tiers = buildBadges(NONE).map((b) => b.tier);

    expect([...tiers].sort((a, b) => a - b)).toEqual(tiers);
    expect(new Set(tiers)).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it("cada nivel exige mas que el anterior: las metas de una misma cadena solo crecen", () => {
    const goalOf = (id: string) => buildBadges(NONE).find((b) => b.id === id)!.goal;

    for (const chain of [
      ["memory-5", "memory-10", "memory-15", "memory-20"],
      ["route-5", "route-10", "route-15"],
      ["points-100", "points-400", "points-700", "points-900"],
      ["clean-board", "clean-board-12"],
      ["days-2", "days-5"],
      ["perfect-memory", "perfect-memory-14"],
      ["steady", "steady-5"],
      ["comeback", "comeback-10"],
      ["flawless-run", "flawless-runs-3"],
      ["collector-14", "collector-20", "collector-30"],
      ["case-steps-40", "case-steps-80"],
      ["case-run-1", "case-runs-3"],
      ["days-2", "days-5", "days-10", "days-20"],
      ["points-100", "points-400", "points-700", "points-900", "points-1100"],
    ]) {
      const goals = chain.map(goalOf);

      expect(goals, chain.join(",")).toEqual([...goals].sort((a, b) => a - b));
      expect(new Set(goals).size, chain.join(",")).toBe(goals.length);
    }

    // Las de nivel 5 piden mas que sus equivalentes de nivel 1.
    expect(goalOf("points-900")).toBeGreaterThan(goalOf("points-100"));
  });

  it("con el banco de 25, las metas de mini casos crecen y las de banco siguen su tamaño", () => {
    const goalOf = (id: string) => buildBadges({ ...NONE, totalCases: 25 }).find((b) => b.id === id)!.goal;

    expect(["first-case", "cases-10", "half-bank", "cases-explorer"].map(goalOf)).toEqual([1, 10, 13, 25]);
    expect(["ordered-mind", "perfect-cases-10", "perfect-half-bank", "perfect-80-bank", "full-bank-perfect"].map(goalOf)).toEqual([
      5, 10, 13, 20, 25,
    ]);

    // Si el banco crece, las de fraccion del banco suben solas; las fijas no.
    const bigger = buildBadges({ ...NONE, totalCases: 30 });

    expect(bigger.find((b) => b.id === "perfect-80-bank")!.goal).toBe(24);
    expect(bigger.find((b) => b.id === "cases-10")!.goal).toBe(10);
  });

  it("las insignias de pasos y partidas de mini casos solo las da haber jugado mini casos", () => {
    const base = { ...NONE, totalCases: 25 };

    expect(earned({ ...base, levelsPassed: 40, seriationBest: 20, nodesBest: 15 })).not.toContain("case-run-1");

    const played = earned({ ...base, playedCases: 1, caseSteps: 40, caseRuns: 1 });

    expect(played).toEqual(expect.arrayContaining(["first-case", "case-steps-40", "case-run-1"]));
    expect(played).not.toContain("case-steps-80");
  });

  it("con todo logrado se ganan las 47, incluidas las de coleccionista", () => {
    expect(earned(EVERYTHING)).toHaveLength(BADGE_COUNT);
  });

  it("coleccionista cuenta las demas insignias ganadas, no a si misma", () => {
    const facts: BadgeFacts = {
      ...NONE,
      levelsPassed: 1,
      gamesPlayed: 3,
      seriationBest: 10,
      nodesBest: 10,
      firstTryLevels: 5,
      finishedAttempts: 3,
      totalPoints: 100,
      comebacks: 3,
      flawlessNodes: 5,
      flawlessSeriation: 6,
      daysPlayed: 2,
      records: 1,
      perfectCases: 5,
    };
    const badges = buildBadges(facts);
    const ownEarned = badges.filter((b) => b.earned && !b.id.startsWith("collector")).length;

    expect(badges.find((b) => b.id === "collector-14")!.current).toBe(Math.min(14, ownEarned));
    expect(ownEarned).toBeGreaterThanOrEqual(14);
    expect(badges.find((b) => b.id === "collector-14")!.earned).toBe(true);
    expect(badges.find((b) => b.id === "collector-20")!.earned).toBe(false);
  });

  it("las insignias del banco usan su tamano; con el banco desconocido no se regalan", () => {
    const some = buildBadges({ ...NONE, perfectCases: 11, playedCases: 12 });

    expect(some.find((b) => b.id === "full-bank-perfect")).toMatchObject({ goal: 12, current: 11, earned: false });
    expect(some.find((b) => b.id === "cases-explorer")!.earned).toBe(true);

    const unknown = buildBadges({ ...NONE, totalCases: 0 });

    expect(unknown.find((b) => b.id === "full-bank-perfect")).toMatchObject({ goal: 1, earned: false });
    expect(unknown.find((b) => b.id === "cases-explorer")!.earned).toBe(false);
  });

  it("ninguna insignia pasa de su meta", () => {
    for (const b of buildBadges(EVERYTHING)) expect(b.current).toBeLessThanOrEqual(b.goal);
  });
});
