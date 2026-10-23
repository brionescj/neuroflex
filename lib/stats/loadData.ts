import { GameAttempt } from "../models/GameAttempt";
import { GameLevelResult } from "../models/GameLevelResult";
import { MiniCase } from "../models/MiniCase";
import { Student } from "../models/Student";
import type { ChartDef } from "./charts";
import type {
  AttemptRow,
  GameId,
  ResultRow,
  StatsData,
  StudentRow,
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
  "color-sequence": ["passed", "correctCount", "sequenceLength"],
  "node-connection": [],
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
  const caseTitles: Record<string, string> = {};

  if (def.game === "general") {
    // La actividad solo necesita cuando se completo cada nivel o caso.
    if (def.id === "activity") {
      results = (await GameLevelResult.find()
        .select("attemptId studentRut gameId completedAt")
        .lean()) as ResultRow[];
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

  return { students, attempts, results, caseTitles };
}
