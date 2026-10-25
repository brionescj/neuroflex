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
  "node-connection": [
    "passed",
    "solved",
    "pairCount",
    "errors",
    "errorsAllowed",
    "blockedCount",
    "undoCount",
    "resetCount",
    "routeRestarts",
    "backtrackGestures",
    "strokesLeftOpen",
    "cellsErased",
    "firstStrokeMs",
    "maxPauseMs",
    "longPauses",
  ],
  "mini-cases": ["correctSteps", "isFullyCorrect"],
};

export async function loadStudents(): Promise<StudentRow[]> {
  return (await Student.find({ isDeleted: { $ne: true } })
    .select(STUDENT_FIELDS)
    .lean()) as StudentRow[];
}

/**
 * Lo que ya se pidio hace muy poco se reutiliza (y una peticion identica que llega mientras
 * la primera sigue en curso espera la misma respuesta). Los graficos leen colecciones enteras:
 * al cambiar un filtro o abrir otro grafico unos segundos despues, no hace falta volver a leerlas.
 * Un dato nuevo tarda como maximo estos milisegundos en verse.
 */
export const DATA_REUSE_MS = 8000;

const reuse = new Map<string, { at: number; promise: Promise<unknown> }>();

export function reusePromise<T>(key: string, load: () => Promise<T>, ms: number = DATA_REUSE_MS): Promise<T> {
  const hit = reuse.get(key);

  if (hit && Date.now() - hit.at < ms) return hit.promise as Promise<T>;

  const promise = load();

  reuse.set(key, { at: Date.now(), promise });

  // Una lectura fallida no se reutiliza.
  promise.catch(() => {
    if (reuse.get(key)?.promise === promise) reuse.delete(key);
  });

  return promise;
}

/** Solo para pruebas: vacia lo reutilizable. */
export function forgetReusable(): void {
  reuse.clear();
}

export function loadChartData(def: ChartDef): Promise<StatsData> {
  return reusePromise(`chart:${def.game}:${def.id}`, () => readChartData(def));
}

async function readChartData(def: ChartDef): Promise<StatsData> {
  const gameFilter = def.game === "general" ? {} : { gameId: def.game };

  // Todas las lecturas salen a la vez: antes iban una tras otra y cada una pagaba su
  // propio viaje de ida y vuelta a la base.
  const studentsRequest = loadStudents();
  const attemptsRequest = GameAttempt.find(gameFilter).select(ATTEMPT_FIELDS).lean() as Promise<AttemptRow[]>;

  let resultsRequest: Promise<ResultRow[]> = Promise.resolve([]);
  let unlocksRequest: Promise<UnlockRow[]> = Promise.resolve([]);
  let casesRequest: Promise<{ caseKey: string; title: string }[]> = Promise.resolve([]);

  if (def.game === "general") {
    // La actividad solo necesita cuando se completo cada nivel o caso.
    if (def.id === "activity") {
      resultsRequest = GameLevelResult.find()
        .select("attemptId studentRut gameId completedAt")
        .lean() as Promise<ResultRow[]>;
    }

    // El resumen calcula ademas el ranking de logros: necesita los tres juegos y lo que puntua cada resultado.
    if (def.id === "gen-summary") {
      resultsRequest = GameLevelResult.find()
        .select(
          "attemptId studentRut gameId key index tryNumber activeMsNet metrics.passed metrics.solved metrics.correctCount metrics.sequenceLength metrics.percent metrics.errors metrics.errorsAllowed metrics.correctSteps metrics.isFullyCorrect",
        )
        .lean() as Promise<ResultRow[]>;
      casesRequest = MiniCase.find({ enabled: true }).select("caseKey title").lean() as Promise<{ caseKey: string; title: string }[]>;
    }

    // Las listas de avance necesitan el nivel (y el tiempo) de cada nivel de seriacion y nodos.
    if (def.id === "gen-stuck" || def.id === "gen-locked") {
      resultsRequest = GameLevelResult.find({ gameId: { $in: ["color-sequence", "node-connection"] } })
        .select("attemptId studentRut gameId index tryNumber activeMsNet metrics.passed metrics.correctCount metrics.sequenceLength")
        .lean() as Promise<ResultRow[]>;
    }

    if (def.id === "gen-summary" || def.id === "gen-locked") {
      unlocksRequest = GameUnlock.find().select("studentRut gameId unlockedAt").lean() as Promise<UnlockRow[]>;
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

    resultsRequest = GameLevelResult.find({ gameId: def.game }).select(projection).lean() as Promise<ResultRow[]>;
  }

  if (def.game === "mini-cases") {
    casesRequest = MiniCase.find().select("caseKey title").lean() as Promise<{ caseKey: string; title: string }[]>;
  }

  const [students, attempts, results, unlocks, cases] = await Promise.all([
    studentsRequest,
    attemptsRequest,
    resultsRequest,
    unlocksRequest,
    casesRequest,
  ]);

  const caseTitles: Record<string, string> = {};

  for (const item of cases) caseTitles[item.caseKey] = item.title;

  // Un resultado sin metricas (nodos) llega sin ese campo: se normaliza.
  for (const result of results) {
    if (!result.metrics) result.metrics = {};
  }

  const caseKeys =
    def.game === "general" && def.id === "gen-summary"
      ? cases.map((item) => item.caseKey).sort((a, b) => a.localeCompare(b, "es", { numeric: true }))
      : undefined;

  return { students, attempts, results, unlocks, caseTitles, ...(caseKeys ? { caseKeys } : {}) };
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

  // Lo de TODOS los estudiantes (para comparar con el grupo) se lee una vez y se reutiliza si el
  // administrador abre a otro estudiante enseguida; lo del estudiante mismo se lee siempre.
  const [group, own] = await Promise.all([
    reusePromise("profile:group", readGroupData),
    GameLevelResult.find({ studentRut: rut }).select(ownProjection).lean() as Promise<ResultRow[]>,
  ]);

  const results = [...own, ...group.others.filter((row) => row.studentRut !== rut)];

  for (const result of results) {
    if (!result.metrics) result.metrics = {};
  }

  return { students: group.students, attempts: group.attempts, results, unlocks: group.unlocks, caseTitles: group.caseTitles };
}

async function readGroupData() {
  const [students, attempts, others, unlocks, cases] = await Promise.all([
    loadStudents(),
    GameAttempt.find().select(ATTEMPT_FIELDS).lean() as Promise<AttemptRow[]>,
    GameLevelResult.find({ gameId: { $in: ["color-sequence", "node-connection"] } })
      .select("attemptId studentRut gameId index tryNumber activeMsNet metrics.passed metrics.correctCount metrics.sequenceLength")
      .lean() as Promise<ResultRow[]>,
    GameUnlock.find().select("studentRut gameId unlockedAt").lean() as Promise<UnlockRow[]>,
    MiniCase.find().select("caseKey title").lean() as Promise<{ caseKey: string; title: string }[]>,
  ]);

  const caseTitles: Record<string, string> = {};

  for (const item of cases) caseTitles[item.caseKey] = item.title;

  return { students, attempts, others, unlocks, caseTitles };
}
