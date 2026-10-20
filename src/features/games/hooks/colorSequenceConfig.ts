export const MIN_SEQUENCE_LENGTH = 2;

/**
 * Niveles que el alumno debe completar antes de poder terminar el juego.
 * No hay tope superior: cada nivel agrega un color a la secuencia y el juego
 * sigue hasta que el alumno decide terminar (a partir del nivel 11) o falla.
 */
export const MIN_LEVELS = 10;

/**
 * Solo para validar un avance guardado (evita arreglos enormes por un dato
 * editado a mano). Llegar a este nivel exigiria recordar mil colores seguidos.
 */
export const MAX_SAVED_LEVEL = 1000;

export type LevelResult = {
  level: number;
  sequenceLength: number;
  correctCount: number;
  timeMs: number;
};
