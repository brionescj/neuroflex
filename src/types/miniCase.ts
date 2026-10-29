/** Un mini caso tal como lo ve el administrador (con la clave de respuesta, que el estudiante nunca recibe). */
export type AdminMiniCaseOption = {
  optionKey: string;

  text: string;

  /** Lugar correcto de la alternativa, 1 a 4. */
  correctStep: 1 | 2 | 3 | 4;
};

export type AdminMiniCase = {
  caseKey: string;

  /** Solo el area, sin «Mini Caso N». */
  title: string;

  /** Clave del dibujo del catalogo; ausente en casos guardados antes de existir la galeria. */
  imageKey?: string;

  baseText: string;

  twistText: string;

  promptText: string;

  feedback: string;

  options: AdminMiniCaseOption[];

  /** Otras secuencias que tambien se aceptan como correctas (casi ningun caso las tiene). */
  alternateOrders?: string[][];

  /** false = retirado del juego. */
  enabled: boolean;
};

/** Lo que se envia al guardar: sin `caseKey` se crea un caso nuevo; con el, se actualiza ese caso. */
export type SaveMiniCasePayload = {
  caseKey?: string;

  title: string;

  imageKey: string;

  baseText: string;

  twistText: string;

  promptText: string;

  feedback: string;

  options: { optionKey?: string; text: string; correctStep: 1 | 2 | 3 | 4 }[];

  enabled?: boolean;
};
