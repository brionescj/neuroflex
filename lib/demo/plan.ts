import { analyzeColorSequenceResponse, type ColorTap } from "../attemptEvents.js";
import {
  buildStudentSnapshot,
  colorSequenceThresholdPercent,
  scoreColorSequenceLevel,
  summarizeResults,
  type StudentSnapshot,
} from "../gameAttempts.js";
import { NODE_MAX_TRIES, NODE_MIN_LEVELS, nodeAllowedErrors, nodeErrorsOf } from "../nodeRules.js";
import {
  MINI_CASES_UNLOCK_LEVEL,
  meetsMiniCasesRule,
  type MiniCasesEvidence,
} from "../gameUnlocks.js";
import { analyzeMiniCaseOrder, primaryOrder, type TextOption } from "../miniCaseScoring.js";
import { chileLocalToUtc, chileToday } from "./chileTime.js";
import type { DemoProfile } from "./profiles.js";
import {
  between,
  clamp,
  int,
  makeRng,
  normal,
  pick,
  poisson,
  seedFrom,
  shuffle,
  sigmoid,
  type Rng,
} from "./random.js";

/**
 * Partidas inventadas para ver los graficos con datos. Cada una sigue las
 * reglas reales de su juego (niveles, intentos, umbrales de aprobacion y la
 * regla de desbloqueo de Mini casos) y se guarda con la misma forma que las que
 * llegan del navegador.
 */

export type DemoGameId = "color-sequence" | "node-connection" | "mini-cases";

/** Copias de lo que define el navegador; demoPlan.test.ts comprueba que no se desfasen. */
export const COLOR_SEQUENCE_VERSION = "color-sequence-2";
export const NODE_VERSION = "nodes-15-4827409f-r4";

/** Tamano del tablero y pares de cada uno de los 15 niveles de Conexion de nodos. */
export const NODE_LEVELS: readonly { board: number; pairs: number }[] = [
  [4, 2], [4, 3], [5, 3], [5, 4], [5, 5], [6, 5], [6, 6], [7, 6],
  [7, 7], [7, 7], [7, 7], [8, 7], [8, 8], [8, 8], [8, 8],
].map(([board, pairs]) => ({ board: board as number, pairs: pairs as number }));

const SEQUENCE_COLORS = ["blue", "green", "orange", "red"] as const;
const TRIES_PER_LEVEL = 3;
const MAX_SERIATION_LEVEL = 25;
const ABANDON_CHANCE = 0.06;

export type DemoDevice = {
  pointer: "touch" | "mouse";
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  platform: string;
  browser: string;
  timeZone: string;
  language: string;
};

export type DemoResult = {
  key: string;
  index: number;
  tryNumber: number;
  metrics: Record<string, unknown>;
  events: Record<string, unknown>[];
  activeMsGross: number;
  activeMsNet: number;
  completedAt: Date;
};

export type DemoAttempt = {
  attemptId: string;
  sessionId: string;
  gameId: DemoGameId;
  attemptNumber: number;
  status: "in_progress" | "finished" | "failed";
  startedAt: Date;
  lastActivityAt: Date;
  finishedAt?: Date;
  contentVersion: string;
  student: StudentSnapshot;
  device: DemoDevice;
  summary: Record<string, number>;
  results: DemoResult[];
};

export type DemoUnlock = { unlockedAt: Date; evidence: MiniCasesEvidence };

export type DemoPlan = {
  attempts: DemoAttempt[];
  /** null si no alcanzo la regla: ese estudiante no ve Mini casos. */
  unlock: DemoUnlock | null;
};

export type DemoMiniCase = {
  caseKey: string;
  options: TextOption[];
  alternateOrders: string[][];
};

export type PlanInput = {
  profile: DemoProfile;
  /** La ficha del estudiante ya con los datos de prueba (de aqui sale la foto de cada partida). */
  student: Record<string, unknown>;
  miniCases: DemoMiniCase[];
  miniCasesVersion: string;
  now: Date;
  /** Partidas reales que ya tiene por juego, para que el numero de intento no choque. */
  existingAttempts?: Partial<Record<DemoGameId, number>>;
};

export const ATTEMPT_PREFIX = "demo-";

const SHORT: Record<DemoGameId, string> = {
  "color-sequence": "cs",
  "node-connection": "nc",
  "mini-cases": "mc",
};

type Clock = { day: number; startMinute: number };

/** Una partida con su resultado y el momento (relativo) en que ocurrio. */
type Draft = Omit<DemoAttempt, "attemptNumber" | "startedAt" | "lastActivityAt" | "finishedAt" | "attemptId" | "sessionId" | "student" | "device" | "contentVersion"> & {
  clock: Clock;
  /** Milisegundos desde el inicio de la partida hasta cada resultado (mismo orden que `results`). */
  offsets: number[];
  durationMs: number;
};

type Skill = {
  /** Nivel de Seriacion que domina al comenzar y cuanto mejora por partida. */
  cap: number;
  learn: number;
  /** Multiplicador del tiempo en nodos (mayor = mas lento) y propension a corregir. */
  slow: number;
  care: number;
  /** Probabilidad base de ordenar bien un mini caso y su mejora por partida. */
  mini: number;
  miniLearn: number;
  /** Ritmo de toque en seriacion (mayor = mas lento). */
  tempo: number;
};

function skillOf(profile: DemoProfile, rng: Rng): Skill {
  const locked = profile.locked;
  const cap = locked
    ? between(rng, 4.5, Math.min(profile.lockedAboveLevel - 0.5, 8))
    : between(rng, 10.5, 15.5);

  return {
    cap,
    learn: locked ? between(rng, 0.03, 0.1) : between(rng, 0.08, 0.28),
    slow: between(rng, 0.65, 1.45),
    care: between(rng, 0.35, 1.25),
    mini: between(rng, 0.4, 0.92),
    miniLearn: between(rng, 0.005, 0.02),
    tempo: between(rng, 0.7, 1.5),
  };
}

function deviceOf(rng: Rng): DemoDevice {
  const roll = rng();

  if (roll >= 0.62 && roll < 0.72) {
    return {
      pointer: "touch",
      viewportWidth: pick(rng, [768, 820, 834]),
      viewportHeight: pick(rng, [1024, 1180, 1194]),
      pixelRatio: 2,
      platform: pick(rng, ["Android", "iPad"]),
      browser: pick(rng, ["Chrome", "Safari"]),
      timeZone: "America/Santiago",
      language: "es-CL",
    };
  }

  if (roll < 0.62) {
    return {
      pointer: "touch",
      viewportWidth: pick(rng, [360, 375, 390, 412]),
      viewportHeight: pick(rng, [740, 800, 844, 915]),
      pixelRatio: pick(rng, [2, 2.625, 3]),
      platform: pick(rng, ["Android", "iPhone"]),
      browser: pick(rng, ["Chrome", "Safari"]),
      timeZone: "America/Santiago",
      language: "es-CL",
    };
  }

  return {
    pointer: "mouse",
    viewportWidth: pick(rng, [1280, 1366, 1440, 1920]),
    viewportHeight: pick(rng, [720, 768, 900, 1080]),
    pixelRatio: pick(rng, [1, 1.25, 1.5]),
    platform: pick(rng, ["Windows", "macOS"]),
    browser: pick(rng, ["Chrome", "Edge", "Firefox"]),
    timeZone: "America/Santiago",
    language: "es-CL",
  };
}

/** Tiempo bruto y neto: casi siempre iguales; a veces una pausa larga que el neto recorta. */
function withIdle(rng: Rng, activeMs: number): { gross: number; net: number } {
  if (rng() >= 0.03) return { gross: Math.round(activeMs), net: Math.round(activeMs) };

  const pause = int(rng, 90_000, 200_000);

  return { gross: Math.round(activeMs + pause), net: Math.round(activeMs + 80_000) };
}

// ---------------------------------------------------------------------------
// Seriacion de colores
// ---------------------------------------------------------------------------

function makeTaps(rng: Rng, shown: string[], errors: number, tempo: number): ColorTap[] {
  const answer = [...shown];
  const used = new Set<number>();
  let remaining = errors;
  let guard = 0;

  while (remaining > 0 && guard++ < 200) {
    const i = int(rng, 0, shown.length - 1);

    if (used.has(i)) continue;

    const next = i + 1;
    const canSwap =
      remaining >= 2 &&
      next < shown.length &&
      !used.has(next) &&
      shown[i] !== shown[next] &&
      rng() < 0.35;

    if (canSwap) {
      answer[i] = shown[next] as string;
      answer[next] = shown[i] as string;
      used.add(i);
      used.add(next);
      remaining -= 2;
    } else {
      answer[i] = pick(rng, SEQUENCE_COLORS.filter((c) => c !== shown[i]));
      used.add(i);
      remaining -= 1;
    }
  }

  let t = Math.round(between(rng, 700, 2200) * tempo);

  return answer.map((color, index) => {
    if (index > 0) {
      const slowdown = rng() < 0.08 ? between(rng, 1.8, 3.2) : 1;

      t += Math.round(between(rng, 350, 1000) * tempo * slowdown);
    }

    return { c: color, t };
  });
}

function playSeriation(
  rng: Rng,
  profile: DemoProfile,
  skill: Skill,
  sessionIndex: number,
  hasPassedTen: boolean,
  abandonAfterLevel: number | null,
): Draft {
  let capNow = skill.cap + skill.learn * sessionIndex + normal(rng) * 0.7;

  // Quien debe desbloquear Mini casos termina pasando el nivel 10 (como tarde, en la tercera partida).
  if (!profile.locked && !hasPassedTen && sessionIndex >= 2) capNow = Math.max(capNow, 12.5);
  if (profile.locked) capNow = Math.min(capNow, profile.lockedAboveLevel + 0.4);

  const results: DemoResult[] = [];
  const offsets: number[] = [];
  let clock = 0;
  let status: "in_progress" | "finished" | "failed" = "in_progress";
  let level = 1;

  const base = new Date(0);

  while (level <= MAX_SERIATION_LEVEL) {
    const length = level + 1;
    const needed = Math.ceil((colorSequenceThresholdPercent(level) * length) / 100);
    let passedLevel = false;

    for (let tryNumber = 1; tryNumber <= TRIES_PER_LEVEL; tryNumber++) {
      const impossible = profile.locked && level > profile.lockedAboveLevel;
      const passes = !impossible && rng() < sigmoid((capNow - level + 0.3) / 1.1);
      const correct = passes
        ? clamp(needed + Math.floor(Math.pow(rng(), 0.6) * (length - needed + 1)), needed, length)
        : clamp(Math.round(length * between(rng, 0.3, 0.85)), 0, needed - 1);

      const shown = Array.from({ length }, () => pick(rng, SEQUENCE_COLORS) as string);
      const taps = makeTaps(rng, shown, length - correct, skill.tempo);
      const analysis = analyzeColorSequenceResponse(shown, taps);
      const actualCorrect = analysis.positionCorrect.filter(Boolean).length;
      const illuminationMs = Math.round(length * between(rng, 750, 900) + 600);
      const first = taps[0]?.t ?? 0;
      const last = taps[taps.length - 1]?.t ?? 0;
      const { gross, net } = withIdle(rng, illuminationMs + last + between(rng, 1200, 2600));

      clock += gross;

      const metrics = {
        sequenceLength: length,
        correctCount: actualCorrect,
        ...scoreColorSequenceLevel(level, length, actualCorrect),
        timeMs: last - first,
        shownSequence: shown,
        illuminationMs,
        ...analysis,
      };

      results.push({
        key: tryNumber <= 1 ? String(level) : `${level}.${tryNumber}`,
        index: level,
        tryNumber,
        metrics,
        events: taps.map((tap) => ({ c: tap.c, t: tap.t })),
        activeMsGross: gross,
        activeMsNet: net,
        completedAt: new Date(base.getTime() + clock),
      });
      offsets.push(clock);

      clock += Math.round(between(rng, 3000, 9000));

      if (metrics.passed) {
        passedLevel = true;
        break;
      }
    }

    if (!passedLevel) {
      // Sin intentos: en un nivel obligatorio (1 a 10) la partida cuenta como fallida; despues, como terminada.
      status = level <= MINI_CASES_UNLOCK_LEVEL ? "failed" : "finished";
      break;
    }

    if (abandonAfterLevel !== null && level >= abandonAfterLevel) break;

    if (level >= MINI_CASES_UNLOCK_LEVEL) {
      const stop = level === MINI_CASES_UNLOCK_LEVEL ? 0.15 : Math.min(0.5, 0.18 + 0.02 * (level - 11));

      if (rng() < stop || level >= MAX_SERIATION_LEVEL) {
        status = "finished";
        break;
      }
    }

    level += 1;
  }

  return {
    gameId: "color-sequence",
    status,
    summary: {},
    results,
    offsets,
    durationMs: clock,
    clock: { day: 0, startMinute: 0 },
  };
}

// ---------------------------------------------------------------------------
// Conexion de nodos
// ---------------------------------------------------------------------------

function playNodes(rng: Rng, profile: DemoProfile, skill: Skill, sessionIndex: number, abandonAfterLevel: number | null): Draft {
  const results: DemoResult[] = [];
  const offsets: number[] = [];
  const base = new Date(0);
  let clock = 0;
  let status: "in_progress" | "finished" | "failed" = "in_progress";

  levels: for (let level = 1; level <= NODE_LEVELS.length; level++) {
    const { board, pairs } = NODE_LEVELS[level - 1] as { board: number; pairs: number };
    const allowed = nodeAllowedErrors(level, pairs);
    // Cada partida se juega un poco mas rapido que la anterior.
    const baseSeconds =
      (10 + 6 * Math.pow(level, 1.35)) * skill.slow * Math.pow(0.97, sessionIndex) * Math.exp(normal(rng) * 0.25);
    // Un mal dia: mas choques de lo habitual en todos los intentos del nivel.
    const badDay = Math.exp(normal(rng) * 0.45);

    for (let tryNumber = 1; tryNumber <= NODE_MAX_TRIES; tryNumber++) {
      // Con el tablero ya visto, el reintento sale algo mejor.
      // Con cada partida corrigen menos: aprenden que deshacer y retroceder tambien cuentan.
      const learning = Math.pow(0.88, sessionIndex) * (!profile.locked && sessionIndex >= 2 ? 0.6 : 1);
      const carelessness = skill.care * badDay * learning * (tryNumber === 1 ? 1 : 0.8);
      let reset = poisson(rng, carelessness * 0.08 * Math.pow(level, 0.6));
      let blocked = poisson(rng, carelessness * 0.3 * level);
      let undo = poisson(rng, carelessness * (0.3 + 0.18 * pairs));
      let backtrackGestures = poisson(rng, carelessness * 0.12 * pairs);
      let routeRestarts = poisson(rng, carelessness * 0.1 * pairs);
      const countsOf = () => ({ blockedCount: blocked, resetCount: reset, undoCount: undo, routeRestarts, backtrackGestures });
      const failed = nodeErrorsOf(countsOf()) > allowed;

      if (failed) {
        // El intento termina en cuanto los errores superan lo permitido: lo que se hizo despues no existe.
        while (nodeErrorsOf(countsOf()) > allowed + 1) {
          if (undo > 0) undo -= 1;
          else if (backtrackGestures > 0) backtrackGestures -= 1;
          else if (routeRestarts > 0) routeRestarts -= 1;
          else if (blocked > 0) blocked -= 1;
          else reset -= 1;
        }

        // Si quedo un error de menos (el ultimo restado valia dos), se completa con un choque.
        if (nodeErrorsOf(countsOf()) <= allowed) blocked += allowed + 1 - nodeErrorsOf(countsOf());
      }

      const errors = nodeErrorsOf(countsOf());
      const seconds = baseSeconds * (failed ? between(rng, 0.35, 0.8) : 1) * (tryNumber === 1 ? 1 : 0.85);
      const { gross, net } = withIdle(rng, seconds * 1000);

      const backtrackCells = backtrackGestures * int(rng, 1, 3);
      const restartCells = routeRestarts * int(rng, 2, 6);
      const resetCells = reset * int(rng, 4, 12);

      clock += gross;

      results.push({
        key: tryNumber <= 1 ? String(level) : `${level}.${tryNumber}`,
        index: level,
        tryNumber,
        metrics: {
          solved: !failed,
          passed: !failed,
          errors,
          errorsAllowed: allowed,
          pairCount: pairs,
          boardSize: board,
          undoCount: undo,
          resetCount: reset,
          corrections: undo + reset,
          strokesStarted: pairs + routeRestarts + backtrackGestures + int(rng, 0, pairs),
          backtrackCells,
          backtrackGestures,
          routeRestarts,
          restartCells,
          resetCells,
          blockedCount: blocked,
          cellsErased: backtrackCells + restartCells + resetCells,
          eventsDropped: 0,
        },
        events: [],
        activeMsGross: gross,
        activeMsNet: net,
        completedAt: new Date(base.getTime() + clock),
      });
      offsets.push(clock);

      clock += Math.round(between(rng, 3000, 8000));

      if (!failed) break;

      if (tryNumber === NODE_MAX_TRIES) {
        // Sin intentos: en un nivel obligatorio (1 a 10) la partida cuenta como fallida; despues, como terminada.
        status = level <= NODE_MIN_LEVELS ? "failed" : "finished";
        break levels;
      }
    }

    if (abandonAfterLevel !== null && level >= abandonAfterLevel) break;

    if (level === NODE_LEVELS.length) status = "finished";
  }

  return {
    gameId: "node-connection",
    status,
    summary: {},
    results,
    offsets,
    durationMs: clock,
    clock: { day: 0, startMinute: 0 },
  };
}

// ---------------------------------------------------------------------------
// Mini casos
// ---------------------------------------------------------------------------

/** Ordena los pasos: parte del orden correcto y lo estropea segun la habilidad. */
function answerFor(rng: Rng, correct: string[], ability: number): string[] {
  if (rng() < (1 - ability) * 0.15) return shuffle(rng, correct);

  const order = [...correct];

  for (let pass = 0; pass < 3; pass++) {
    const i = int(rng, 0, order.length - 2);

    if (rng() < (1 - ability) * 0.55) {
      [order[i], order[i + 1]] = [order[i + 1] as string, order[i] as string];
    }
  }

  return order;
}

function playMiniCases(
  rng: Rng,
  skill: Skill,
  sessionIndex: number,
  cases: DemoMiniCase[],
  abandonAfterCase: number | null,
): Draft {
  const results: DemoResult[] = [];
  const offsets: number[] = [];
  const base = new Date(0);
  const ability = clamp(skill.mini + skill.miniLearn * sessionIndex, 0.2, 0.97);
  let clock = 0;
  let status: "in_progress" | "finished" = "in_progress";

  shuffle(rng, cases).forEach((miniCase, position) => {
    if (abandonAfterCase !== null && position >= abandonAfterCase) return;

    const correct = primaryOrder(miniCase.options);
    const ordered = answerFor(rng, correct, ability);
    const displayed = shuffle(rng, correct);
    const removals = poisson(rng, (1 - ability) * 2);
    const taps = 4 + removals + int(rng, 0, 2);
    const readMs = Math.round(between(rng, 12_000, 35_000) * skill.slow);
    const twistReadMs = Math.round(between(rng, 6_000, 22_000) * skill.slow);
    const firstTapMs = Math.round(between(rng, 3_000, 12_000));
    const decisionTimeMs = Math.round(between(rng, 20_000, 65_000) * skill.slow);
    const { gross, net } = withIdle(rng, readMs + twistReadMs + decisionTimeMs);

    clock += gross;

    results.push({
      key: miniCase.caseKey,
      index: position + 1,
      tryNumber: 1,
      metrics: {
        decisionTimeMs,
        firstTapMs,
        twistReadMs,
        taps,
        removals,
        ...analyzeMiniCaseOrder(miniCase.options, miniCase.alternateOrders, ordered, displayed),
        orderedOptionKeys: ordered,
      },
      events: [],
      activeMsGross: gross,
      activeMsNet: net,
      completedAt: new Date(base.getTime() + clock),
    });
    offsets.push(clock);

    clock += Math.round(between(rng, 2500, 7000));
  });

  if (abandonAfterCase === null) status = "finished";

  return {
    gameId: "mini-cases",
    status,
    summary: {},
    results,
    offsets,
    durationMs: clock,
    clock: { day: 0, startMinute: 0 },
  };
}

// ---------------------------------------------------------------------------
// Calendario
// ---------------------------------------------------------------------------

type Scheduled = { draft: Draft; abandoned: boolean };

export function planStudent(input: PlanInput): DemoPlan {
  const { profile, student, miniCases, now } = input;
  const rng = makeRng(seedFrom(`${profile.rut}|juego`));
  const skill = skillOf(profile, rng);
  const device = deviceOf(rng);
  const target: Record<DemoGameId, number> = {
    "color-sequence": int(rng, 12, 14),
    "node-connection": int(rng, 12, 14),
    "mini-cases": int(rng, 12, 14),
  };
  const done: Record<DemoGameId, number> = { "color-sequence": 0, "node-connection": 0, "mini-cases": 0 };

  const scheduled: Scheduled[] = [];
  let seriationPassedTen = false;
  let nodeMax = 0;
  let seriationMax = 0;
  // En un objeto (y no en variables sueltas): se asigna desde `observe`.
  const unlocked: { at: { clock: Clock; offsetMs: number } | null; evidence: MiniCasesEvidence | null } = {
    at: null,
    evidence: null,
  };
  let day = 0;

  const startMinuteFor = () =>
    profile.studyShift === "day" ? int(rng, 9 * 60, 15 * 60 + 30) : int(rng, 18 * 60, 21 * 60);

  const learnIndex = (game: DemoGameId) => done[game];

  const observe = (draft: Draft) => {
    draft.results.forEach((result, index) => {
      if (draft.gameId === "color-sequence" && result.metrics.passed === true) {
        seriationMax = Math.max(seriationMax, result.index);
        if (result.index >= MINI_CASES_UNLOCK_LEVEL) seriationPassedTen = true;
      }

      if (draft.gameId === "node-connection" && result.metrics.passed === true) {
        nodeMax = Math.max(nodeMax, result.index);
      }

      if (
        !unlocked.at &&
        meetsMiniCasesRule({ colorSequenceMaxLevelPassed: seriationMax, nodeMaxLevelPassed: nodeMax })
      ) {
        unlocked.at = { clock: draft.clock, offsetMs: draft.offsets[index] as number };
        unlocked.evidence = { colorSequenceMaxLevelPassed: seriationMax, nodeMaxLevelPassed: nodeMax };
      }
    });
  };

  for (let guard = 0; guard < 150; guard++) {
    const eligible = (Object.keys(target) as DemoGameId[]).filter(
      (game) => done[game] < target[game] && (game !== "mini-cases" || unlocked.at !== null),
    );

    if (eligible.length === 0) break;

    const games = shuffle(rng, eligible).slice(0, eligible.length > 1 && rng() < 0.6 ? 2 : 1);
    let minute = startMinuteFor();

    for (const game of games) {
      const play = (abandonAfter: number | null): Draft => {
        const draft =
          game === "color-sequence"
            ? playSeriation(rng, profile, skill, learnIndex(game), seriationPassedTen, abandonAfter)
            : game === "node-connection"
              ? playNodes(rng, profile, skill, learnIndex(game), abandonAfter)
              : playMiniCases(rng, skill, learnIndex(game), miniCases, abandonAfter);

        draft.clock = { day, startMinute: minute };
        minute += Math.ceil(draft.durationMs / 60_000) + int(rng, 8, 35);

        return draft;
      };

      // A veces una partida queda a medias antes de la que si se completa.
      if (rng() < ABANDON_CHANCE && minute < 22 * 60) {
        const limit = game === "mini-cases" ? int(rng, 2, 7) : int(rng, 2, 8);
        const partial = play(limit);

        if (partial.results.length > 0 && partial.status === "in_progress") {
          scheduled.push({ draft: partial, abandoned: true });
          observe(partial);
        }
      }

      if (minute > 22 * 60 + 30) break;

      const draft = play(null);

      scheduled.push({ draft, abandoned: false });
      observe(draft);
      done[game] += 1;
    }

    day += rng() < 0.55 ? 1 : rng() < 0.65 ? 2 : rng() < 0.7 ? 3 : 5;
  }

  // ---- Fechas reales: el ultimo dia de juego es entre ayer y hace 3 dias.
  const lastDay = scheduled.reduce((max, s) => Math.max(max, s.draft.clock.day), 0);
  const lastDate = chileToday(now) - (1 + int(rng, 0, 2)) * 86_400_000;
  const dateOf = (offsetDay: number) => new Date(lastDate - (lastDay - offsetDay) * 86_400_000);
  const startOf = (clock: Clock) => {
    const date = dateOf(clock.day);

    return chileLocalToUtc(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      Math.floor(clock.startMinute / 60),
      clock.startMinute % 60,
    );
  };

  const attempts: DemoAttempt[] = [];

  for (const game of ["color-sequence", "node-connection", "mini-cases"] as DemoGameId[]) {
    const own = scheduled
      .filter((s) => s.draft.gameId === game)
      .sort((a, b) => startOf(a.draft.clock).getTime() - startOf(b.draft.clock).getTime());
    const offset = input.existingAttempts?.[game] ?? 0;

    own.forEach(({ draft }, index) => {
      const startedAt = startOf(draft.clock);
      const number = offset + index + 1;
      const id = `${ATTEMPT_PREFIX}${SHORT[game]}-${profile.rut.replace(/[^0-9kK]/g, "")}-${index + 1}`;
      const results = draft.results.map((r) => ({
        ...r,
        completedAt: new Date(startedAt.getTime() + r.completedAt.getTime()),
      }));
      const closed = draft.status !== "in_progress";
      const last = results[results.length - 1];
      const lastActivityAt = last ? last.completedAt : startedAt;

      attempts.push({
        attemptId: id,
        sessionId: `${ATTEMPT_PREFIX}ses-${SHORT[game]}-${profile.rut.replace(/[^0-9kK]/g, "")}-${index + 1}`,
        gameId: game,
        attemptNumber: number,
        status: draft.status,
        startedAt,
        lastActivityAt,
        ...(closed ? { finishedAt: lastActivityAt } : {}),
        contentVersion:
          game === "color-sequence"
            ? COLOR_SEQUENCE_VERSION
            : game === "node-connection"
              ? NODE_VERSION
              : input.miniCasesVersion,
        student: buildStudentSnapshot(student, startedAt),
        device,
        summary: closed ? summarizeResults(game, results) : {},
        results,
      });
    });
  }

  const unlock: DemoUnlock | null =
    unlocked.at && unlocked.evidence
      ? {
          unlockedAt: new Date(startOf(unlocked.at.clock).getTime() + unlocked.at.offsetMs),
          evidence: unlocked.evidence,
        }
      : null;

  return { attempts, unlock };
}
