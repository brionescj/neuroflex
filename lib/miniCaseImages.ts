/**
 * Imagenes de apoyo de los mini casos: el catalogo de dibujos que el administrador elige al crear o
 * editar un caso, y que el juego muestra 4 segundos entre la lectura y la alerta de cambio.
 *
 * El servidor solo conoce las claves (para validar lo que llega); los dibujos y sus etiquetas viven en
 * src/config/miniCaseImages.ts y src/features/games/mini-cases/images/. Un test comprueba que ambas
 * listas coincidan.
 */
export const MINI_CASE_IMAGE_KEYS = [
  "aula",
  "mesa-equipo",
  "patio",
  "rutina-visual",
  "cuaderno",
  "globo",
  "bloques",
  "matematicas",
  "reunion-familia",
  "laboratorio",
  "biblioteca",
  "circulo",
  "rincon-calma",
  "taller",
  "espacio",
  "reloj",
  "lupa",
  "universidad",
  "rampa",
  "investigacion",
] as const;

export type MiniCaseImageKey = (typeof MINI_CASE_IMAGE_KEYS)[number];

/** La que se usa cuando un caso no trae imagen (casos guardados antes de existir el catalogo). */
export const DEFAULT_MINI_CASE_IMAGE: MiniCaseImageKey = "aula";

export function isMiniCaseImageKey(value: unknown): value is MiniCaseImageKey {
  return typeof value === "string" && (MINI_CASE_IMAGE_KEYS as readonly string[]).includes(value);
}
