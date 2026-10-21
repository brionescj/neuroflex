/**
 * Lo que el navegador manda a POST /api/game-attempts/:gameId. Debe coincidir
 * con lo que valida lib/gameAttempts.ts.
 */

export type DevicePointer = "touch" | "mouse" | "mixed";

export type DeviceInfo = {
  pointer: DevicePointer;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  platform: string;
  browser: string;
  timeZone: string;
  language: string;
};

/** Identifica la partida en curso. Se guarda dentro del avance del juego. */
export type AttemptHandle = {
  attemptId: string;
  /** ISO 8601. */
  startedAt: string;
};

/** Un valor JSON simple: numero, texto, booleano, nulo, lista u objeto. */
export type MetricValue =
  | number
  | string
  | boolean
  | null
  | MetricValue[]
  | { [key: string]: MetricValue };

/** Un nivel (seriacion, nodos) o un caso (mini casos) terminado. */
export type LevelReport = {
  /** Unico dentro del intento: "3" para el nivel 3, o el caseKey. */
  key: string;
  /** Nivel o numero de caso, desde 1. */
  index: number;
  tryNumber: number;
  /** Metricas propias del juego. */
  metrics: Record<string, MetricValue>;
  /** Tiempo con la pestana visible. */
  activeMsGross: number;
  /** Tiempo visible sin la inactividad de mas de 80 s. */
  activeMsNet: number;
  /** ISO 8601. */
  completedAt: string;
  /** Solo mini casos: el orden final elegido, para que el servidor puntue. */
  orderedOptionKeys?: string[];
};

export type AttemptCloseStatus = "finished" | "failed";

export type AttemptBlock = AttemptHandle & {
  contentVersion: string;
  sessionId: string;
  device: DeviceInfo;
};

export type AttemptRequest =
  | { type: "level"; attempt: AttemptBlock; result: LevelReport }
  | { type: "close"; attempt: AttemptBlock; status: AttemptCloseStatus }
  | {
      type: "batch";
      attempt: AttemptBlock;
      results: LevelReport[];
      /** Si viene, el mismo mensaje cierra el intento. */
      status?: AttemptCloseStatus;
    };

/** "retry": fallo transitorio (sin red o error del servidor). */
export type SendOutcome = "ok" | "retry" | "rejected";
