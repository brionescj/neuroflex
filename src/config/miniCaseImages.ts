/**
 * Catalogo de imagenes de los mini casos: clave y nombre con que se muestran en la galeria del
 * administrador. Las claves deben coincidir con MINI_CASE_IMAGE_KEYS de lib/miniCaseImages.ts (un test
 * lo comprueba); los dibujos estan en features/games/mini-cases/images/.
 */
export const MINI_CASE_IMAGE_OPTIONS = [
  { value: "aula", label: "Sala de clases" },
  { value: "mesa-equipo", label: "Mesa de trabajo en equipo" },
  { value: "patio", label: "Patio de recreo" },
  { value: "rutina-visual", label: "Rutina con pictogramas" },
  { value: "cuaderno", label: "Cuaderno y lápices" },
  { value: "globo", label: "Globo terráqueo" },
  { value: "bloques", label: "Torre de bloques" },
  { value: "matematicas", label: "Material de matemáticas" },
  { value: "reunion-familia", label: "Reunión con la familia" },
  { value: "laboratorio", label: "Germinador de ciencias" },
  { value: "biblioteca", label: "Biblioteca y lectura" },
  { value: "circulo", label: "Círculo de conversación" },
  { value: "rincon-calma", label: "Rincón de calma" },
  { value: "taller", label: "Taller de ensamblaje" },
  { value: "espacio", label: "Cielo estrellado y telescopio" },
  { value: "reloj", label: "Reloj y arena" },
  { value: "lupa", label: "Lupa y lámpara" },
  { value: "universidad", label: "Campus universitario" },
  { value: "rampa", label: "Entrada accesible" },
  { value: "investigacion", label: "Microscopio y gráficos" },
] as const;

export type MiniCaseImageKey = (typeof MINI_CASE_IMAGE_OPTIONS)[number]["value"];

export const DEFAULT_MINI_CASE_IMAGE: MiniCaseImageKey = "aula";

export function isMiniCaseImageKey(value: unknown): value is MiniCaseImageKey {
  return MINI_CASE_IMAGE_OPTIONS.some((option) => option.value === value);
}

export function miniCaseImageLabel(key: string): string {
  return MINI_CASE_IMAGE_OPTIONS.find((option) => option.value === key)?.label ?? key;
}
