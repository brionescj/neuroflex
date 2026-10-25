import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { LEVELS } from "../../src/features/games/node-connection/levels";
import { nodeContentVersion } from "../../src/features/games/node-connection/hooks/nodeReport";
import { parseLevelReport } from "../gameAttempts";
import { meetsMiniCasesRule } from "../gameUnlocks";
import { nodeAllowedErrors, nodeErrorsOf } from "../nodeRules";
import { chileLocalToUtc } from "./chileTime";
import {
  COLOR_SEQUENCE_VERSION,
  NODE_LEVELS,
  NODE_VERSION,
  planStudent,
  type DemoAttempt,
  type DemoMiniCase,
} from "./plan";
import { ALT_EMAIL_DOMAIN, LOCK_EVERY, cleanEmail, buildProfiles, randomBirthDate } from "./profiles";

const NOW = new Date("2026-10-23T15:00:00Z");

const ROSTER = Array.from({ length: 39 }, (_, i) => ({
  rut: `${10_000_000 + i * 1_371}-${i % 10}`,
  email: `ALUMNO${i}@alumno.uvm.cl`,
}));

const MINI_CASES: DemoMiniCase[] = Array.from({ length: 10 }, (_, c) => ({
  caseKey: `caso-${c + 1}`,
  alternateOrders: [],
  options: ["a", "b", "c", "d"].map((letter, i) => ({
    optionKey: `caso-${c + 1}-${letter}`,
    text: `Paso ${letter}`,
    correctStep: ((i + c) % 4) + 1,
  })),
}));

const profiles = buildProfiles(ROSTER, NOW);

function plan(index: number) {
  const profile = profiles[index]!;

  return planStudent({
    profile,
    student: {
      rut: profile.rut,
      paralelo: 1,
      entryYear: 2026,
      birthDate: profile.birthDate,
      studyShift: profile.studyShift,
      ciudad: "Temuco",
      region: "La Araucanía",
      university: profile.university,
    },
    miniCases: MINI_CASES,
    miniCasesVersion: "bank-test",
    now: NOW,
  });
}

const closed = (attempts: DemoAttempt[], game: string) =>
  attempts.filter((a) => a.gameId === game && a.status !== "in_progress");

describe("fichas de prueba", () => {
  it("la mitad de la lista cambia de dominio y de universidad", () => {
    const moved = profiles.filter((p) => p.email.endsWith(`@${ALT_EMAIL_DOMAIN}`));
    const kept = profiles.filter((p) => p.email.endsWith("@alumno.uvm.cl"));

    expect(moved).toHaveLength(19);
    expect(kept).toHaveLength(20);
    expect(moved.every((p) => p.university === "santo-tomas")).toBe(true);
    expect(kept.every((p) => p.university === "uvm")).toBe(true);
    // Conserva lo anterior a la arroba y queda en minusculas.
    expect(profiles[1]!.email).toMatch(/^alumno\d+@alumno\.st\.cl$/);
  });

  it("los correos conservan la ñ y pierden las tildes, como exige el sistema", () => {
    expect(cleanEmail(" MUÑOZ.PÉREZ@ALUMNO.UVM.CL ")).toBe("muñoz.perez@alumno.uvm.cl");
  });

  it("todos van al paralelo 1, con jornada de ambos tipos y edad de 18 a 42", () => {
    expect(profiles.every((p) => p.paralelo === 1)).toBe(true);
    expect(new Set(profiles.map((p) => p.studyShift))).toEqual(new Set(["day", "evening"]));

    for (const p of profiles) {
      const born = new Date(`${p.birthDate}T00:00:00Z`);
      let age = NOW.getUTCFullYear() - born.getUTCFullYear();

      if (NOW.getUTCMonth() < born.getUTCMonth() || (NOW.getUTCMonth() === born.getUTCMonth() && NOW.getUTCDate() < born.getUTCDate())) age -= 1;

      expect(age, p.birthDate).toBeGreaterThanOrEqual(18);
      expect(age, p.birthDate).toBeLessThanOrEqual(42);
    }
  });

  it("es el mismo resultado cada vez (misma semilla)", () => {
    expect(buildProfiles(ROSTER, NOW)).toEqual(profiles);
    expect(randomBirthDate("1-9", NOW)).toBe(randomBirthDate("1-9", NOW));
  });

  it("una de cada cinco queda sin poder desbloquear Mini casos", () => {
    expect(profiles.filter((p) => p.locked)).toHaveLength(Math.floor((39 + LOCK_EVERY - 3) / LOCK_EVERY));
  });
});

describe("partidas de prueba", () => {
  it("quien desbloquea tiene 12 o mas partidas cerradas de cada juego, y Mini casos llega despues", () => {
    const { attempts, unlock } = plan(0);

    expect(unlock).not.toBeNull();

    for (const game of ["color-sequence", "node-connection", "mini-cases"]) {
      expect(closed(attempts, game).length, game).toBeGreaterThanOrEqual(12);
    }

    for (const attempt of attempts.filter((a) => a.gameId === "mini-cases")) {
      expect(attempt.startedAt.getTime()).toBeGreaterThan(unlock!.unlockedAt.getTime());
    }

    expect(meetsMiniCasesRule(unlock!.evidence)).toBe(true);
  });

  it("quien se queda corto en Seriacion nunca pasa el nivel 10 ni ve Mini casos", () => {
    const index = profiles.findIndex((p) => p.locked);
    const { attempts, unlock } = plan(index);

    expect(unlock).toBeNull();
    expect(attempts.some((a) => a.gameId === "mini-cases")).toBe(false);
    expect(closed(attempts, "color-sequence").length).toBeGreaterThanOrEqual(12);
    expect(closed(attempts, "node-connection").length).toBeGreaterThanOrEqual(12);

    const passed = attempts
      .filter((a) => a.gameId === "color-sequence")
      .flatMap((a) => a.results)
      .filter((r) => r.metrics.passed === true)
      .map((r) => r.index);

    expect(Math.max(0, ...passed)).toBeLessThanOrEqual(profiles[index]!.lockedAboveLevel);
    expect(Math.max(0, ...passed)).toBeLessThan(10);
  });

  it("en todo el grupo: unos desbloquean y otros no, sin fechas futuras ni numeros repetidos", () => {
    const all = profiles.map((_, i) => plan(i));

    expect(all.filter((p) => p.unlock === null)).toHaveLength(profiles.filter((p) => p.locked).length);

    for (const { attempts } of all) {
      for (const attempt of attempts) {
        expect(attempt.lastActivityAt.getTime()).toBeLessThan(NOW.getTime());
        expect(attempt.startedAt.getTime()).toBeLessThanOrEqual(attempt.lastActivityAt.getTime());
        expect(attempt.attemptId.startsWith("demo-")).toBe(true);
        expect(attempt.attemptId).toMatch(/^[A-Za-z0-9_-]{8,64}$/);

        // Los resultados de una partida avanzan en el tiempo.
        const times = attempt.results.map((r) => r.completedAt.getTime());

        expect([...times].sort((a, b) => a - b)).toEqual(times);
        expect(times.every((t) => t >= attempt.startedAt.getTime())).toBe(true);
      }

      for (const game of ["color-sequence", "node-connection", "mini-cases"]) {
        const numbers = attempts.filter((a) => a.gameId === game).map((a) => a.attemptNumber).sort((a, b) => a - b);

        expect(numbers).toEqual(numbers.map((_, i) => i + 1));
      }

      expect(new Set(attempts.map((a) => a.attemptId)).size).toBe(attempts.length);
    }
  });

  it("cada resultado pasa las mismas validaciones que las partidas reales", () => {
    for (const index of [0, 1, 2, 3, 10]) {
      for (const attempt of plan(index).attempts) {
        for (const result of attempt.results) {
          const parsed = parseLevelReport(
            attempt.gameId,
            {
              key: result.key,
              index: result.index,
              tryNumber: result.tryNumber,
              metrics: result.metrics,
              activeMsGross: result.activeMsGross,
              activeMsNet: result.activeMsNet,
              completedAt: result.completedAt.toISOString(),
              orderedOptionKeys: result.metrics.orderedOptionKeys ?? undefined,
              events: attempt.gameId === "color-sequence" ? result.events : undefined,
            },
            NOW,
          );

          expect(parsed.ok, `${attempt.attemptId} ${result.key}`).toBe(true);

          // En Seriacion los toques calzan con la secuencia: no se descartan.
          if (parsed.ok && attempt.gameId === "color-sequence") {
            expect(parsed.value.metrics.eventsDiscarded).toBeUndefined();
            expect(parsed.value.events).toHaveLength(Number(result.metrics.sequenceLength));
          }
        }
      }
    }
  });

  it("el resumen de una partida cerrada sale de sus resultados; una abandonada no tiene", () => {
    const { attempts } = plan(0);
    const seriation = closed(attempts, "color-sequence")[0]!;

    expect(seriation.summary.levelsReported).toBe(seriation.results.length);
    expect(seriation.summary.maxLevel).toBe(Math.max(...seriation.results.map((r) => r.index)));
    expect(seriation.finishedAt).toBeDefined();

    const stale = attempts.filter((a) => a.status === "in_progress");

    for (const attempt of stale) {
      expect(attempt.summary).toEqual({});
      expect(attempt.finishedAt).toBeUndefined();
    }
  });

  it("Seriacion usa los umbrales y la regla de cierre reales", () => {
    const { attempts } = plan(0);

    for (const attempt of attempts.filter((a) => a.gameId === "color-sequence")) {
      for (const r of attempt.results) {
        expect(r.metrics.sequenceLength).toBe(r.index + 1);
        expect(r.tryNumber).toBeLessThanOrEqual(3);
        expect(r.key).toBe(r.tryNumber === 1 ? String(r.index) : `${r.index}.${r.tryNumber}`);
      }

      if (attempt.status === "failed") {
        // Agoto los 3 intentos de un nivel obligatorio.
        const lastRow = attempt.results[attempt.results.length - 1]!;

        expect(lastRow.index).toBeLessThanOrEqual(10);
        expect(lastRow.tryNumber).toBe(3);
        expect(lastRow.metrics.passed).toBe(false);
      }
    }
  });

  it("Nodos usa los errores permitidos y la regla de cierre reales", () => {
    const { attempts } = plan(0);

    for (const attempt of attempts.filter((a) => a.gameId === "node-connection")) {
      for (const r of attempt.results) {
        const errors = nodeErrorsOf({
          blockedCount: Number(r.metrics.blockedCount),
          resetCount: Number(r.metrics.resetCount),
        });

        expect(r.tryNumber).toBeLessThanOrEqual(3);
        expect(r.key).toBe(r.tryNumber === 1 ? String(r.index) : `${r.index}.${r.tryNumber}`);
        expect(r.metrics.errors).toBe(errors);
        expect(r.metrics.errorsAllowed).toBe(nodeAllowedErrors(r.index, Number(r.metrics.pairCount)));
        // Un intento perdido termina apenas se superan los errores permitidos.
        expect(r.metrics.passed).toBe(errors <= Number(r.metrics.errorsAllowed));
        expect(r.metrics.solved).toBe(r.metrics.passed);
      }
    }
  });

  it("Nodos termina al completar los 15 niveles o al agotar los intentos; Mini casos trae los 10 casos", () => {
    const { attempts } = plan(0);

    for (const attempt of closed(attempts, "node-connection")) {
      const last = attempt.results[attempt.results.length - 1]!;

      if (last.metrics.passed === true) {
        expect(last.index).toBe(15);
      } else {
        expect(last.tryNumber).toBe(3);
        expect(attempt.status).toBe(last.index <= 10 ? "failed" : "finished");
      }
    }

    for (const attempt of closed(attempts, "mini-cases")) {
      expect(new Set(attempt.results.map((r) => r.key)).size).toBe(10);
      expect(attempt.contentVersion).toBe("bank-test");

      for (const r of attempt.results) {
        expect(r.metrics.correctSteps).toBeGreaterThanOrEqual(0);
        expect(r.metrics.correctSteps).toBeLessThanOrEqual(4);
        expect(r.metrics.isFullyCorrect).toBe(r.metrics.correctSteps === 4);
      }
    }
  });

  it("la edad de la foto de cada partida esta entre 18 y 42", () => {
    const { attempts } = plan(0);

    for (const attempt of attempts) {
      expect(attempt.student.ageAtStart).toBeGreaterThanOrEqual(18);
      expect(attempt.student.ageAtStart).toBeLessThanOrEqual(42);
      expect(attempt.student.paralelo).toBe(1);
    }
  });

  it("es determinista", () => {
    expect(plan(4)).toEqual(plan(4));
  });

  it("no choca con partidas reales: el numero de intento sigue al ultimo", () => {
    const profile = profiles[0]!;
    const { attempts } = planStudent({
      profile,
      student: { birthDate: profile.birthDate },
      miniCases: MINI_CASES,
      miniCasesVersion: "x",
      now: NOW,
      existingAttempts: { "color-sequence": 2 },
    });

    const numbers = attempts.filter((a) => a.gameId === "color-sequence").map((a) => a.attemptNumber);

    expect(Math.min(...numbers)).toBe(3);
  });
});

describe("hora de Chile", () => {
  it("verano UTC-3 e invierno UTC-4", () => {
    expect(chileLocalToUtc(2026, 10, 23, 10, 0).toISOString()).toBe("2026-10-23T13:00:00.000Z");
    expect(chileLocalToUtc(2026, 7, 10, 10, 0).toISOString()).toBe("2026-07-10T14:00:00.000Z");
  });
});

describe("copias de lo que define el navegador", () => {
  it("la version y los tableros de Nodos coinciden", () => {
    expect(NODE_VERSION).toBe(nodeContentVersion());
    expect(NODE_LEVELS).toEqual(LEVELS.map((l) => ({ board: l.rows, pairs: l.pairs.length })));
  });

  it("la version de Seriacion coincide", () => {
    const source = readFileSync("src/features/games/hooks/colorSequenceConfig.ts", "utf8");

    expect(source).toContain(`COLOR_SEQUENCE_CONTENT_VERSION = "${COLOR_SEQUENCE_VERSION}"`);
  });
});

describe("documentos para la base", () => {
  it("encajan en los modelos de partidas, resultados y desbloqueos", async () => {
    const { GameAttempt } = await import("../models/GameAttempt");
    const { GameLevelResult } = await import("../models/GameLevelResult");
    const { GameUnlock } = await import("../models/GameUnlock");
    const { attemptDocuments, resultDocuments } = await import("./documents");

    const result = plan(0);

    for (const doc of attemptDocuments("1-9", result)) {
      await expect(new GameAttempt(doc).validate(), doc.attemptId).resolves.toBeUndefined();
    }

    for (const doc of resultDocuments("1-9", result).slice(0, 300)) {
      await expect(new GameLevelResult(doc).validate(), `${doc.attemptId} ${doc.key}`).resolves.toBeUndefined();
    }

    const unlock = new GameUnlock({
      studentRut: "1-9",
      gameId: "mini-cases",
      unlockedAt: result.unlock!.unlockedAt,
      source: "demo-seed",
      rule: "mini-cases-v1",
      evidence: result.unlock!.evidence,
    });

    await expect(unlock.validate()).resolves.toBeUndefined();
    // Validar cientos de documentos con mongoose tarda varios segundos en una
    // maquina lenta (en Windows pasaba de los 5 s por defecto).
  }, 30_000);
});
