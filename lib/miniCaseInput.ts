import { isMiniCaseImageKey } from "./miniCaseImages";

/**
 * Valida lo que el administrador envia para crear o editar un mini caso. Es una funcion pura para
 * poder probarla sin base de datos; el handler (admin/miniCases.ts) la usa y completa lo que depende
 * de lo ya guardado (claves de opciones, secuencias alternativas).
 */
export const MAX_TITLE = 120;
export const MAX_LONG_TEXT = 1500;
export const MAX_OPTION_TEXT = 500;

const CASE_KEY = /^caso-\d{1,3}$/;
const OPTION_KEY = /^[a-z0-9-]{1,40}$/;

export type MiniCaseOptionInput = {
  optionKey?: string;
  text: string;
  correctStep: 1 | 2 | 3 | 4;
};

export type MiniCaseInput = {
  caseKey?: string;
  title: string;
  imageKey?: string;
  baseText: string;
  twistText: string;
  promptText: string;
  feedback: string;
  options: MiniCaseOptionInput[];
  alternateOrders?: unknown;
};

export type ParsedMiniCase = { ok: true; value: MiniCaseInput } | { ok: false; message: string };

const fail = (message: string): ParsedMiniCase => ({ ok: false, message });

function text(raw: unknown, label: string, max: number): string | { error: string } {
  if (typeof raw !== "string" || raw.trim().length === 0) return { error: `Falta ${label}.` };

  const value = raw.trim().replace(/[ \t]+/g, " ");

  if (value.length > max) return { error: `${label[0]?.toUpperCase()}${label.slice(1)} supera los ${max} caracteres.` };

  return value;
}

export function parseMiniCaseInput(body: unknown): ParsedMiniCase {
  const raw = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const title = text(raw.title, "el título", MAX_TITLE);
  const baseText = text(raw.baseText, "el caso", MAX_LONG_TEXT);
  const twistText = text(raw.twistText, "la alerta de cambio", MAX_LONG_TEXT);
  const promptText = text(raw.promptText, "la consigna", MAX_LONG_TEXT);
  const feedback = text(raw.feedback, "la retroalimentación", MAX_LONG_TEXT);

  for (const field of [title, baseText, twistText, promptText, feedback]) {
    if (typeof field !== "string") return fail(field.error);
  }

  let caseKey: string | undefined;

  if (raw.caseKey !== undefined && raw.caseKey !== null && raw.caseKey !== "") {
    if (typeof raw.caseKey !== "string" || !CASE_KEY.test(raw.caseKey)) {
      return fail("La clave del caso debe tener la forma «caso-12».");
    }

    caseKey = raw.caseKey;
  }

  let imageKey: string | undefined;

  if (raw.imageKey !== undefined && raw.imageKey !== null && raw.imageKey !== "") {
    if (!isMiniCaseImageKey(raw.imageKey)) return fail("La imagen elegida no existe en la galería.");

    imageKey = raw.imageKey;
  }

  if (!Array.isArray(raw.options) || raw.options.length !== 4) {
    return fail("Se requieren exactamente 4 alternativas.");
  }

  const options: MiniCaseOptionInput[] = [];

  for (const item of raw.options) {
    const option = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const optionText = text(option.text, "el texto de cada alternativa", MAX_OPTION_TEXT);

    if (typeof optionText !== "string") return fail(optionText.error);

    const step = option.correctStep;

    if (step !== 1 && step !== 2 && step !== 3 && step !== 4) {
      return fail("Cada alternativa debe indicar su lugar correcto (1 a 4).");
    }

    if (option.optionKey !== undefined && (typeof option.optionKey !== "string" || !OPTION_KEY.test(option.optionKey))) {
      return fail("La clave de una alternativa no es válida.");
    }

    options.push({
      ...(typeof option.optionKey === "string" ? { optionKey: option.optionKey } : {}),
      text: optionText,
      correctStep: step,
    });
  }

  if (new Set(options.map((o) => o.correctStep)).size !== 4) {
    return fail("Las 4 alternativas deben tener un lugar correcto distinto, del 1 al 4.");
  }

  const keys = options.flatMap((o) => (o.optionKey ? [o.optionKey] : []));

  if (new Set(keys).size !== keys.length) return fail("Dos alternativas tienen la misma clave.");

  return {
    ok: true,
    value: {
      ...(caseKey ? { caseKey } : {}),
      title: title as string,
      ...(imageKey ? { imageKey } : {}),
      baseText: baseText as string,
      twistText: twistText as string,
      promptText: promptText as string,
      feedback: feedback as string,
      options,
      ...(raw.alternateOrders !== undefined ? { alternateOrders: raw.alternateOrders } : {}),
    },
  };
}

/** El siguiente «caso-N» libre: uno mas que el mayor numero que ya existe. */
export function nextCaseKey(existingKeys: string[]): string {
  const highest = existingKeys.reduce((max, key) => {
    const found = /(\d+)\s*$/.exec(key);

    return found ? Math.max(max, Number(found[1])) : max;
  }, 0);

  return `caso-${highest + 1}`;
}
