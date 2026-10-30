import { DEFAULT_MINI_CASE_IMAGE } from "@/config/miniCaseImages";
import type { AdminMiniCase } from "@/types";

/** La consigna que usan todos los casos del banco; se ofrece ya escrita al crear uno nuevo. */
export const DEFAULT_PROMPT_TEXT =
  "Ante este nuevo escenario, ordena cronológicamente del 1 al 4 los pasos del plan de acción:";

export type MiniCaseFormState = {
  title: string;
  imageKey: string;
  baseText: string;
  twistText: string;
  promptText: string;
  feedback: string;
  /** Una por lugar correcto (la primera es el paso 1). Al editar conservan la clave de la alternativa. */
  options: { optionKey?: string; text: string }[];
  /** Casilla «Este caso acepta otro orden correcto». Desmarcada, el caso solo acepta el orden principal. */
  acceptsOtherOrders: boolean;
  /**
   * Otros ordenes correctos. Cada uno lista, por posicion (primero, segundo...), el lugar que la alternativa tiene en
   * el orden principal (1 a 4); null = aun sin elegir.
   */
  alternateOrders: (number | null)[][];
};

/** Hasta cuantos ordenes correctos adicionales acepta un caso (igual que el servidor). */
export const MAX_ALTERNATE_ORDERS = 5;

export const EMPTY_ALTERNATE_ORDER: (number | null)[] = [null, null, null, null];

/** El numero del caso segun su clave («caso-12» es el 12). */
export function miniCaseNumber(caseKey: string): number {
  const found = /(\d+)\s*$/.exec(caseKey);

  return found ? Number(found[1]) : Number.MAX_SAFE_INTEGER;
}

/** Como se rotula un caso en el panel de administracion: «Mini Caso 12». */
export function miniCaseLabel(caseKey: string): string {
  return `Mini Caso ${miniCaseNumber(caseKey)}`;
}

/** El titulo completo que ve el administrador: «Mini Caso 12: Área de Lenguaje y Comunicación». */
export function miniCaseFullTitle(caseKey: string, title: string): string {
  return `${miniCaseLabel(caseKey)}: ${title}`;
}

export function initialMiniCaseState(initial: AdminMiniCase | undefined): MiniCaseFormState {
  if (!initial) {
    return {
      title: "",
      imageKey: DEFAULT_MINI_CASE_IMAGE,
      baseText: "",
      twistText: "",
      promptText: DEFAULT_PROMPT_TEXT,
      feedback: "",
      options: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
      acceptsOtherOrders: false,
      alternateOrders: [],
    };
  }

  const ordered = [...initial.options].sort((a, b) => a.correctStep - b.correctStep);
  const stepOfKey = new Map(initial.options.map((option) => [option.optionKey, option.correctStep]));
  const alternateOrders = (initial.alternateOrders ?? []).map((order) => order.map((key) => stepOfKey.get(key) ?? null));

  return {
    title: initial.title,
    imageKey: initial.imageKey ?? DEFAULT_MINI_CASE_IMAGE,
    baseText: initial.baseText,
    twistText: initial.twistText,
    promptText: initial.promptText,
    feedback: initial.feedback,
    options: ordered.map((option) => ({ optionKey: option.optionKey, text: option.text })),
    acceptsOtherOrders: alternateOrders.length > 0,
    alternateOrders,
  };
}

/** Los ordenes adicionales listos para enviar: [] cuando la casilla esta desmarcada (quita los que tuviera). */
export function alternateStepsToSend(state: MiniCaseFormState): (1 | 2 | 3 | 4)[][] {
  return state.acceptsOtherOrders ? (state.alternateOrders as (1 | 2 | 3 | 4)[][]) : [];
}

/** Lo que falta o sobra, en una frase; null si el formulario esta completo. */
export function miniCaseFormProblem(state: MiniCaseFormState): string | null {
  if (state.title.trim().length === 0) return "Escribe el título del mini caso.";
  if (/mini\s*caso/i.test(state.title)) return "Escribe solo el nombre del área: «Mini Caso N:» se agrega solo.";
  if (state.baseText.trim().length === 0) return "Escribe el caso.";
  if (state.twistText.trim().length === 0) return "Escribe la alerta de cambio.";
  if (state.promptText.trim().length === 0) return "Escribe la consigna.";
  if (state.options.some((option) => option.text.trim().length === 0)) return "Completa las 4 alternativas.";

  const texts = state.options.map((option) => option.text.trim().toLowerCase());

  if (new Set(texts).size !== texts.length) return "Hay dos alternativas iguales.";
  if (state.feedback.trim().length === 0) return "Escribe la retroalimentación.";

  return alternateOrdersProblem(state);
}


/** Lo que esta mal en los ordenes correctos adicionales; null si no hay o estan bien. */
function alternateOrdersProblem(state: MiniCaseFormState): string | null {
  if (!state.acceptsOtherOrders) return null;
  if (state.alternateOrders.length === 0) return "Agrega el otro orden correcto o desmarca la casilla.";

  const seen = new Set<string>(["1234"]);

  for (const [index, order] of state.alternateOrders.entries()) {
    const label = state.alternateOrders.length === 1 ? "El otro orden correcto" : `El orden correcto adicional ${index + 1}`;

    if (order.some((step) => step === null)) return `${label} está incompleto: elige una alternativa en cada posición.`;
    if (new Set(order).size !== 4) return `${label} repite una alternativa: usa cada una solo una vez.`;

    const signature = order.join("");

    if (signature === "1234") return `${label} es igual al orden principal.`;
    if (seen.has(signature)) return `${label} repite otro orden correcto.`;

    seen.add(signature);
  }

  return null;
}
