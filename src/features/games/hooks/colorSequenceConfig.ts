/**
 * Vive aqui (y no en ColorGrid.tsx) para que las reglas puras no dependan de
 * un componente: ColorGrid lo vuelve a exportar.
 */
export type SequenceColorId = "blue" | "green" | "orange" | "red";

export const MIN_SEQUENCE_LENGTH = 2;

/**
 * Niveles obligatorios: hay que pasarlos todos antes de poder terminar el
 * juego por voluntad propia. No hay tope superior: cada nivel agrega un color
 * a la secuencia y el juego sigue hasta que el alumno decide terminar (a
 * partir del nivel 11) o agota los intentos de un nivel.
 */
export const MIN_LEVELS = 10;

/**
 * Solo para validar un avance guardado (evita arreglos enormes por un dato
 * editado a mano). Llegar a este nivel exigiria recordar mil colores seguidos.
 */
export const MAX_SAVED_LEVEL = 1000;

export type LevelResult = {
  level: number;
  /** Intento dentro del nivel (1 a 3). Cada intento tiene una secuencia nueva. */
  tryNumber: number;
  /** Si alcanzo el porcentaje que se exige en ese nivel. */
  passed: boolean;
  sequenceLength: number;
  correctCount: number;
  /** Del primer al ultimo toque de la respuesta. */
  timeMs: number;
  /** Tiempo con la pestana visible desde que empieza el nivel. Ausente en partidas guardadas antes del registro. */
  activeMsGross?: number;
  /** Lo mismo sin la inactividad de mas de 80 s. */
  activeMsNet?: number;
  /** ISO 8601. */
  completedAt?: string;
  /** La secuencia que se mostro. Ausente en partidas guardadas antes de registrar toques. */
  shown?: SequenceColorId[];
  /** Tiempo activo que duro la iluminacion, hasta que empezo a responder. */
  illuminationMs?: number;
  /**
   * Cada color que toco, en orden, con los ms desde que empezo a responder
   * (tiempo activo). Siempre trae tantos toques como colores tiene la secuencia.
   */
  taps?: ColorTap[];
};

export type ColorTap = { c: SequenceColorId; t: number };

/**
 * Cambia cuando cambian las reglas o el contenido del juego, para no mezclar
 * en el analisis partidas que no son comparables.
 */
export const COLOR_SEQUENCE_CONTENT_VERSION = "color-sequence-2";
