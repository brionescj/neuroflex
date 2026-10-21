import { describe, expect, it } from "vitest";

import {
  buildProgressSnapshot,
  buildResumePlan,
  parseMiniCasesProgress,
} from "./resume";
import type { ApiMiniCase, MiniCaseResult } from "./types";

function makeCase(n: number): ApiMiniCase {
  return {
    caseKey: `caso-${n}`,
    baseText: `base ${n}`,
    twistText: `giro ${n}`,
    promptText: `consigna ${n}`,
    feedback: `feedback ${n}`,
    options: ["a", "b", "c", "d"].map((l) => ({
      optionKey: `caso-${n}-${l}`,
      text: `opcion ${l} del ${n}`,
    })),
  };
}

function makeResult(caseKey: string): MiniCaseResult {
  return { caseKey, correctSteps: 3, isFullyCorrect: false, decisionTimeMs: 1200 };
}

const bank = [makeCase(1), makeCase(2), makeCase(3), makeCase(4)];

// Partida de 3 casos: el alumno ve 3, 1, 2 (el 4 no entra en esta partida).
const session = [bank[2]!, bank[0]!, bank[1]!];

describe("el comportamiento guardado en un resultado", () => {
  const behavior = {
    displayedOptionKeys: ["caso-3-b", "caso-3-a", "caso-3-d", "caso-3-c"],
    taps: 4,
    removals: 1,
    firstTapMs: 800,
    twistReadMs: 2500,
    wallMs: 6000,
    distractorMotif: "sol",
    distractorSound: "chime",
    selectionLog: [{ o: "caso-3-b", a: "add" as const, t: 800 }],
  };

  it("se conserva al reanudar", () => {
    const snap = buildProgressSnapshot(session, 1, "reading", [
      { ...makeResult("caso-3"), behavior },
    ]);

    expect(parseMiniCasesProgress(snap)?.results[0]?.behavior).toEqual(behavior);
  });

  it("si esta corrupto se descarta sin invalidar el avance", () => {
    const snap = buildProgressSnapshot(session, 1, "reading", [
      { ...makeResult("caso-3"), behavior: { taps: "mucho" } as never },
    ]);
    const parsed = parseMiniCasesProgress(snap);

    expect(parsed).not.toBeNull();
    expect(parsed?.results[0]).not.toHaveProperty("behavior");
  });

  it("un avance anterior, sin comportamiento, sigue siendo valido", () => {
    const snap = buildProgressSnapshot(session, 1, "reading", [makeResult("caso-3")]);

    expect(parseMiniCasesProgress(snap)).toEqual(snap);
  });
});

describe("parseMiniCasesProgress", () => {
  it("acepta un avance valido al inicio de un caso", () => {
    const snap = buildProgressSnapshot(session, 1, "reading", [
      makeResult("caso-3"),
    ]);
    expect(parseMiniCasesProgress(snap)).toEqual(snap);
  });

  it("rechaza basura, null y versiones distintas", () => {
    expect(parseMiniCasesProgress(null)).toBeNull();
    expect(parseMiniCasesProgress("hola")).toBeNull();
    expect(parseMiniCasesProgress({})).toBeNull();
    const snap = buildProgressSnapshot(session, 0, "reading", []);
    expect(parseMiniCasesProgress({ ...snap, version: 2 })).toBeNull();
  });

  it("rechaza si la cantidad de resultados no cuadra con la fase", () => {
    // en "reading" del 2do caso deberia haber exactamente 1 resultado
    const snap = buildProgressSnapshot(session, 1, "reading", []);
    expect(parseMiniCasesProgress(snap)).toBeNull();

    // en "result" del 1er caso deberia haber exactamente 1 resultado
    const snap2 = buildProgressSnapshot(session, 0, "result", []);
    expect(parseMiniCasesProgress(snap2)).toBeNull();
  });

  it("rechaza si un resultado no corresponde al caso de su posicion", () => {
    const snap = buildProgressSnapshot(session, 1, "reading", [
      makeResult("caso-1"), // en la posicion 0 de esta partida estaba caso-3
    ]);
    expect(parseMiniCasesProgress(snap)).toBeNull();
  });

  it("rechaza un indice de caso fuera de rango", () => {
    const snap = buildProgressSnapshot(session, 0, "reading", []);
    expect(parseMiniCasesProgress({ ...snap, caseIndex: 3 })).toBeNull();
    expect(parseMiniCasesProgress({ ...snap, caseIndex: -1 })).toBeNull();
    expect(parseMiniCasesProgress({ ...snap, caseIndex: 0.5 })).toBeNull();
  });

  it("exige todos los resultados y el ultimo indice al terminar", () => {
    const all = session.map((c) => makeResult(c.caseKey));
    const ok = buildProgressSnapshot(session, 2, "finished", all);
    expect(parseMiniCasesProgress(ok)).toEqual(ok);

    const incompleto = buildProgressSnapshot(session, 2, "finished", all.slice(0, 2));
    expect(parseMiniCasesProgress(incompleto)).toBeNull();

    const indiceMalo = buildProgressSnapshot(session, 1, "finished", all);
    expect(parseMiniCasesProgress(indiceMalo)).toBeNull();
  });

  it("rechaza casos repetidos en el orden", () => {
    const snap = buildProgressSnapshot(session, 0, "reading", []);
    expect(
      parseMiniCasesProgress({
        ...snap,
        caseOrder: ["caso-3", "caso-3", "caso-2"],
      }),
    ).toBeNull();
  });
});

describe("buildResumePlan", () => {
  it("restaura el mismo orden de casos y de opciones que vio el alumno", () => {
    // El alumno iba en el 3er ejercicio (indice 2) y ese era el caso-2.
    const shuffledOptions: ApiMiniCase[] = session.map((c) => ({
      ...c,
      options: [...c.options].reverse(),
    }));
    const results = [makeResult("caso-3"), makeResult("caso-1")];
    const snap = buildProgressSnapshot(shuffledOptions, 2, "reading", results);

    const plan = buildResumePlan(bank, snap);

    expect(plan).not.toBeNull();
    expect(plan!.orderedCases.map((c) => c.caseKey)).toEqual([
      "caso-3",
      "caso-1",
      "caso-2",
    ]);
    // opciones en el orden guardado (invertido), no en el del banco
    expect(plan!.orderedCases[2]!.options.map((o) => o.optionKey)).toEqual([
      "caso-2-d",
      "caso-2-c",
      "caso-2-b",
      "caso-2-a",
    ]);
    expect(plan!.snapshot.caseIndex).toBe(2);
  });

  it("ignora casos nuevos del banco que no estaban en la partida", () => {
    const snap = buildProgressSnapshot(session, 0, "reading", []);
    const plan = buildResumePlan([...bank, makeCase(5)], snap);
    expect(plan!.orderedCases).toHaveLength(3);
  });

  it("devuelve null si un caso de la partida ya no existe en el banco", () => {
    const snap = buildProgressSnapshot(session, 0, "reading", []);
    const bankSinCaso3 = bank.filter((c) => c.caseKey !== "caso-3");
    expect(buildResumePlan(bankSinCaso3, snap)).toBeNull();
  });

  it("devuelve null si las opciones de un caso cambiaron", () => {
    const snap = buildProgressSnapshot(session, 0, "reading", []);
    const editado = bank.map((c) =>
      c.caseKey === "caso-1"
        ? { ...c, options: c.options.slice(0, 3) }
        : c,
    );
    expect(buildResumePlan(editado, snap)).toBeNull();

    const clavesDistintas = bank.map((c) =>
      c.caseKey === "caso-1"
        ? {
            ...c,
            options: c.options.map((o, i) =>
              i === 0 ? { ...o, optionKey: "otra" } : o,
            ),
          }
        : c,
    );
    expect(buildResumePlan(clavesDistintas, snap)).toBeNull();
  });

  it("devuelve null ante un avance corrupto", () => {
    expect(buildResumePlan(bank, { cualquier: "cosa" })).toBeNull();
  });
});

describe("registro de partida en el avance", () => {
  const attempt = { attemptId: "abcdefgh12345678", startedAt: "2026-10-14T11:00:00.000Z" };

  it("conserva la partida y los datos del registro de cada caso", () => {
    const full: MiniCaseResult = {
      ...makeResult("caso-3"),
      orderedOptionKeys: ["a", "b", "c", "d"],
      activeMsNet: 800,
      completedAt: "2026-10-14T11:10:00.000Z",
    };
    const snap = buildProgressSnapshot(session, 1, "reading", [full], attempt);
    const parsed = parseMiniCasesProgress(snap);

    expect(parsed?.attempt).toEqual(attempt);
    expect(parsed?.results[0]).toEqual(full);
  });

  it("un avance anterior al registro sigue siendo valido", () => {
    const snap = buildProgressSnapshot(session, 1, "reading", [makeResult("caso-3")]);
    const parsed = parseMiniCasesProgress(snap);

    expect(parsed).not.toBeNull();
    expect(parsed?.attempt).toBeUndefined();
  });

  it("descarta campos opcionales mal formados", () => {
    const bad = {
      ...makeResult("caso-3"),
      orderedOptionKeys: "abcd",
      activeMsNet: -1,
      completedAt: "ayer",
    };
    const snap = buildProgressSnapshot(session, 1, "reading", [bad as unknown as MiniCaseResult]);

    expect(parseMiniCasesProgress(snap)?.results[0]).toEqual(makeResult("caso-3"));
  });
});
