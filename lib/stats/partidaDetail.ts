import { isLevelResultPassed } from "../gameAttempts";
import { chileDate } from "./chartsLists";
import { caseNumber } from "./engine";
import { outcomeOf } from "./studentHistory";
import {
  GAME_LABELS,
  type AttemptRow,
  type PartidaDetail,
  type PartidaItem,
  type PartidaRow,
  type ResultRow,
} from "./types";

/**
 * Los datos de una partida, nivel por nivel: en Seriacion los colores que pidio el
 * sistema frente a los que marco el estudiante; en Nodos los errores y el orden en que
 * unio los colores; en Mini casos el orden correcto frente al que eligio. Todo sale de lo
 * que ya guarda cada resultado (metricas y eventos): nada se calcula de nuevo en el navegador.
 */

/** Copia de SEQUENCE_COLORS (src/features/games/components/ColorGrid.tsx). */
const SEQUENCE_COLOR_INFO: Record<string, { label: string; hex: string }> = {
  blue: { label: "Azul", hex: "#38bdf8" },
  green: { label: "Verde", hex: "#34d399" },
  orange: { label: "Naranja", hex: "#fbbf24" },
  red: { label: "Rojo", hex: "#fb7185" },
};

/** Copia de NODE_COLORS (src/features/games/node-connection/colors.ts). */
const NODE_COLOR_INFO: Record<string, { label: string; hex: string }> = {
  red: { label: "Rojo", hex: "#ef4444" },
  blue: { label: "Azul", hex: "#3b82f6" },
  yellow: { label: "Amarillo", hex: "#facc15" },
  green: { label: "Verde", hex: "#22c55e" },
  orange: { label: "Naranja", hex: "#f97316" },
  pink: { label: "Rosado", hex: "#ec4899" },
  cyan: { label: "Celeste", hex: "#06b6d4" },
  white: { label: "Blanco", hex: "#e4e4e7" },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const numberOf = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

const stringsOf = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === "string") ? (value as string[]) : null;

const seconds = (ms: number) => Math.round((ms / 1000) * 10) / 10;

/** Un resultado con sus eventos (solo Seriacion y Nodos los guardan). */
export type PartidaResult = ResultRow & { events?: unknown[] };

function colorItem(id: string, table: Record<string, { label: string; hex: string }>, ok?: boolean): PartidaItem {
  const info = table[id];

  return { text: info?.label ?? id, ...(info ? { color: info.hex } : {}), ...(ok === undefined ? {} : { ok }) };
}

function colorSequenceRow(result: PartidaResult): PartidaRow {
  const { metrics } = result;
  const shown = stringsOf(metrics.shownSequence);
  const taps = (result.events ?? []).flatMap((event) =>
    isRecord(event) && typeof event.c === "string" ? [event.c] : [],
  );
  const passed = isLevelResultPassed(result);
  const correct = numberOf(metrics.correctCount);
  const length = numberOf(metrics.sequenceLength);
  const firstError = numberOf(metrics.firstErrorPosition);
  const hasDetail = shown !== null && taps.length === shown.length;

  return {
    label: `Nivel ${result.index}`,
    tryText: `Intento ${result.tryNumber}`,
    result: passed ? "Superado" : "No superado",
    ok: passed,
    seconds: seconds(result.activeMsNet),
    lines: hasDetail
      ? [
          { title: "Pidió el sistema", items: shown.map((id) => colorItem(id, SEQUENCE_COLOR_INFO)) },
          {
            title: "Marcó el estudiante",
            items: taps.map((id, i) => colorItem(id, SEQUENCE_COLOR_INFO, shown[i] === id)),
          },
        ]
      : [],
    facts: [
      ...(correct !== null && length !== null ? [{ label: "Colores en su lugar", value: `${correct} de ${length}` }] : []),
      ...(firstError !== null ? [{ label: "Primer error en el color", value: String(firstError) }] : []),
    ],
    notice: hasDetail ? null : "Este nivel no guardó los colores pedidos ni los marcados (se jugó antes de registrarlos).",
  };
}

const NODE_FACTS: { key: string; label: string }[] = [
  { key: "blockedCount", label: "Choques" },
  { key: "undoCount", label: "Deshacer" },
  { key: "resetCount", label: "Rehacer tablero" },
  { key: "routeRestarts", label: "Rehacer una ruta" },
  { key: "backtrackGestures", label: "Retroceder sobre el trazo" },
];

function nodesRow(result: PartidaResult): PartidaRow {
  const { metrics } = result;
  const passed = isLevelResultPassed(result);
  const errors = numberOf(metrics.errors);
  const allowed = numberOf(metrics.errorsAllowed);
  const pairs = numberOf(metrics.pairCount);

  // El orden en que quedo unido cada par: el color de cada trazo que termino conectando.
  const connected: string[] = [];

  for (const event of result.events ?? []) {
    if (isRecord(event) && event.type === "end" && event.done === true && typeof event.color === "string") {
      connected.push(event.color);
    }
  }

  return {
    label: `Nivel ${result.index}`,
    tryText: `Intento ${result.tryNumber}`,
    result: passed ? "Superado" : "No superado",
    ok: passed,
    seconds: seconds(result.activeMsNet),
    lines:
      connected.length > 0
        ? [{ title: "Orden en que unió los colores", items: connected.map((id) => colorItem(id, NODE_COLOR_INFO)) }]
        : [],
    facts: [
      ...(pairs !== null ? [{ label: "Pares", value: String(pairs) }] : []),
      ...(errors !== null
        ? [{ label: "Errores", value: allowed !== null ? `${errors} de ${allowed} permitidos` : String(errors) }]
        : []),
      ...NODE_FACTS.flatMap(({ key, label }) => {
        const value = numberOf(metrics[key]);

        return value === null ? [] : [{ label, value: String(value) }];
      }),
    ],
    notice: null,
  };
}

function miniCaseRow(result: PartidaResult, titles: Record<string, string>): PartidaRow {
  const { metrics } = result;
  const number = caseNumber(result.key);
  const title = titles[result.key];
  const label = number === null ? (title ?? result.key) : title ? `Caso ${number} · ${title}` : `Caso ${number}`;
  const correctSteps = numberOf(metrics.correctSteps);
  const full = metrics.isFullyCorrect === true;

  const options = (Array.isArray(metrics.options) ? metrics.options : []).flatMap((option) =>
    isRecord(option) && typeof option.optionKey === "string" && typeof option.text === "string"
      ? [{ optionKey: option.optionKey, text: option.text, correctStep: numberOf(option.correctStep) ?? 0 }]
      : [],
  );
  const textOf = new Map(options.map((option) => [option.optionKey, option.text]));
  const chosen = stringsOf(metrics.orderedOptionKeys);
  const positionCorrect = Array.isArray(metrics.positionCorrect) ? metrics.positionCorrect : [];

  // El orden correcto es el de la secuencia valida que se uso para puntuar (si el caso tiene mas de una).
  const validOrders = Array.isArray(metrics.validOrders) ? metrics.validOrders.map(stringsOf) : [];
  const matched = numberOf(metrics.matchedSequence) ?? 0;
  const reference =
    validOrders[matched] ?? [...options].sort((a, b) => a.correctStep - b.correctStep).map((option) => option.optionKey);

  const hasDetail = chosen !== null && options.length > 0;

  return {
    label,
    tryText: null,
    result: full ? "Orden completo" : correctSteps === null ? "Sin puntaje" : `${correctSteps} de ${options.length || 4} pasos en su lugar`,
    ok: correctSteps === null ? null : full,
    seconds: seconds(result.activeMsNet),
    lines: hasDetail
      ? [
          {
            title: "Orden correcto",
            items: reference.map((key, i) => ({ text: `${i + 1}. ${textOf.get(key) ?? key}` })),
          },
          {
            title: "Orden que eligió",
            items: chosen.map((key, i) => ({
              text: `${i + 1}. ${textOf.get(key) ?? key}`,
              ok: positionCorrect[i] === true,
            })),
          },
        ]
      : [],
    facts: correctSteps === null ? [] : [{ label: "Pasos en su lugar", value: `${correctSteps} de ${options.length || 4}` }],
    notice: hasDetail ? null : "Este caso no guardó el orden elegido (se jugó antes de registrarlo).",
  };
}

/** Los niveles o casos en el orden en que se jugaron; los intentos de un mismo nivel, juntos. */
function inPlayOrder(results: PartidaResult[]): PartidaResult[] {
  return [...results].sort(
    (a, b) => a.completedAt.getTime() - b.completedAt.getTime() || a.index - b.index || a.tryNumber - b.tryNumber,
  );
}

export function buildPartidaDetail(
  attempt: AttemptRow,
  results: PartidaResult[],
  caseTitles: Record<string, string>,
  now: Date,
): PartidaDetail {
  const ordered = inPlayOrder(results);
  const rows: PartidaRow[] = ordered.map((result) =>
    attempt.gameId === "color-sequence"
      ? colorSequenceRow(result)
      : attempt.gameId === "node-connection"
        ? nodesRow(result)
        : miniCaseRow(result, caseTitles),
  );

  const notes =
    attempt.gameId === "color-sequence"
      ? [
          "Cada nivel se muestra con todos sus intentos, en el orden en que se jugaron.",
          "Los colores marcados fuera de su lugar llevan una marca ✗. El tiempo es el activo (con la pantalla visible, sin pausas largas).",
        ]
      : attempt.gameId === "node-connection"
        ? [
            "Cada tablero se muestra con todos sus intentos, en el orden en que se jugaron.",
            "Los errores son los que cuentan para el margen del nivel: choques, deshacer, rehacer tablero (cuenta doble), rehacer una ruta y retroceder sobre el trazo.",
            "El tiempo es el activo (con la pantalla visible, sin pausas largas).",
          ]
        : [
            "Cada caso se muestra con el orden correcto y el orden que eligió el estudiante; los pasos fuera de lugar llevan una marca ✗.",
            "El tiempo es el que tardó en decidir el orden, sin pausas largas.",
          ];

  return {
    attemptId: attempt.attemptId,
    game: attempt.gameId,
    attemptNumber: attempt.attemptNumber,
    startedAt: chileDate(attempt.startedAt),
    outcome: outcomeOf(attempt, now),
    rows,
    notes,
  };
}

export const PARTIDA_TITLE = (game: AttemptRow["gameId"], attemptNumber: number) =>
  `Datos de la partida ${attemptNumber} de ${GAME_LABELS[game]}`;
