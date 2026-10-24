import { GameAttempt } from "../models/GameAttempt";
import { GameLevelResult } from "../models/GameLevelResult";
import { GameUnlock } from "../models/GameUnlock";
import { MiniCase } from "../models/MiniCase";
import { Student } from "../models/Student";
import type { ChartDef } from "./charts";
import type {
  AttemptRow,
  GameId,
  ResultRow,
  StatsData,
  StudentRow,
  UnlockRow,
} from "./types";

/**
 * Lectura de la base para las estadisticas. Solo trae los campos que se usan:
 * las partidas guardan eventos y registros finos que aqui no hacen falta.
 */
const STUDENT_FIELDS =
  "rut firstName paternalLastName maternalLastName paralelo entryYear birthDate studyShift gender university region ciudad enabled";

const ATTEMPT_FIELDS =
  "attemptId studentRut gameId attemptNumber status startedAt lastActivityAt finishedAt student sessions.device.pointer sessions.device.viewportWidth sessions.device.viewportHeight";

/** Metricas de cada juego que algun grafico necesita. */
const METRICS_BY_GAME: Record<GameId, string[]> = {
  "color-sequence": [
    "passed",
    "correctCount",
    "sequenceLength",
    "swapErrors",
    "substitutionErrors",
    "firstErrorPosition",
    "firstTapMs",
    "meanInterTapMs",
    "maxPauseMs",
  ],
  "node-connection": ["undoCount", "resetCount", "routeRestarts"],
  "mini-cases": ["correctSteps", "isFullyCorrect"],
};

export async function loadStudents(): Promise<StudentRow[]> {
  return (await Student.find({ isDeleted: { $ne: true } })
    .select(STUDENT_FIELDS)
    .lean()) as StudentRow[];
}

export async function loadChartData(def: ChartDef): Promise<StatsData> {
  const gameFilter = def.game === "general" ? {} : { gameId: def.game };

  const [students, attempts] = await Promise.all([
    loadStudents(),
    GameAttempt.find(gameFilter).select(ATTEMPT_FIELDS).lean() as Promise<AttemptRow[]>,
  ]);

  let results: ResultRow[] = [];
  let unlocks: UnlockRow[] = [];
  const caseTitles: Record<string, string> = {};

  if (def.game === "general") {
    // La actividad solo necesita cuando se completo cada nivel o caso.
    if (def.id === "activity") {
      results = (await GameLevelResult.find()
        .select("attemptId studentRut gameId completedAt")
        .lean()) as ResultRow[];
    }

    // El resumen y las listas de avance necesitan el nivel (y el tiempo) de cada nivel de seriacion y nodos.
    if (def.id === "gen-summary" || def.id === "gen-stuck" || def.id === "gen-locked") {
      results = (await GameLevelResult.find({ gameId: { $in: ["color-sequence", "node-connection"] } })
        .select("attemptId studentRut gameId index tryNumber activeMsNet metrics.passed metrics.correctCount metrics.sequenceLength")
        .lean()) as ResultRow[];
    }

    if (def.id === "gen-summary" || def.id === "gen-locked") {
      unlocks = (await GameUnlock.find().select("studentRut gameId unlockedAt").lean()) as UnlockRow[];
    }
  } else {
    const projection: Record<string, 1> = {
      attemptId: 1,
      studentRut: 1,
      gameId: 1,
      key: 1,
      index: 1,
      tryNumber: 1,
      activeMsNet: 1,
      completedAt: 1,
    };

    for (const name of METRICS_BY_GAME[def.game]) projection[`metrics.${name}`] = 1;

    results = (await GameLevelResult.find({ gameId: def.game })
      .select(projection)
      .lean()) as ResultRow[];
  }

  if (def.game === "mini-cases") {
    const cases = (await MiniCase.find().select("caseKey title").lean()) as {
      caseKey: string;
      title: string;
    }[];

    for (const item of cases) caseTitles[item.caseKey] = item.title;
  }

  // Un resultado sin metricas (nodos) llega sin ese campo: se normaliza.
  for (const result of results) {
    if (!result.metrics) result.metrics = {};
  }

  return { students, attempts, results, unlocks, caseTitles };
}

/**
 * Lo necesario para la ficha de un estudiante: todas las partidas (para medir
 * a su grupo), todo lo que guardo ese estudiante, y de los demas solo lo justo
 * para comparar nivel y tiempo en Seriacion y Nodos.
 */
export async function loadStudentProfileData(rut: string): Promise<StatsData> {
  const ownProjection: Record<string, 1> = {
    attemptId: 1,
    studentRut: 1,
    gameId: 1,
    key: 1,
    index: 1,
    tryNumber: 1,
    activeMsNet: 1,
    completedAt: 1,
  };

  for (const game of Object.keys(METRICS_BY_GAME) as GameId[]) {
    for (const name of METRICS_BY_GAME[game]) ownProjection[`metrics.${name}`] = 1;
  }

  const [students, attempts, own, others, unlocks, cases] = await Promise.all([
    loadStudents(),
    GameAttempt.find().select(ATTEMPT_FIELDS).lean() as Promise<AttemptRow[]>,
    GameLevelResult.find({ studentRut: rut }).select(ownProjection).lean() as Promise<ResultRow[]>,
    GameLevelResult.find({ studentRut: { $ne: rut }, gameId: { $in: ["color-sequence", "node-connection"] } })
      .select("attemptId studentRut gameId index tryNumber activeMsNet metrics.passed metrics.correctCount metrics.sequenceLength")
      .lean() as Promise<ResultRow[]>,
    GameUnlock.find().select("studentRut gameId unlockedAt").lean() as Promise<UnlockRow[]>,
    MiniCase.find().select("caseKey title").lean() as Promise<{ caseKey: string; title: string }[]>,
  ]);

  const results = [...own, ...others];

  for (const result of results) {
    if (!result.metrics) result.metrics = {};
  }

  const caseTitles: Record<string, string> = {};

  for (const item of cases) caseTitles[item.caseKey] = item.title;

  return { students, attempts, results, unlocks, caseTitles };
}
