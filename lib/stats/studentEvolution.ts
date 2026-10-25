import { isFirstTryTime } from "../gameAttempts";
import { SERIATION_TIME_CAUTION, deductionOf } from "./deductions";
import { mean, round } from "./numbers";
import { emptyResult, num } from "./profileCommon";
import { bestLevelOf } from "./studentHistory";
import { bucketKey, bucketLabel, chileDay, chileLocalToUtc, nextBucketKey } from "./time";
import {
  GAME_LABELS,
  type AttemptRow,
  type ChartId,
  type EvolutionBy,
  type EvolutionSpan,
  type GameId,
  type ResultRow,
  type StudentEvolution,
  type StudentProfileChart,
} from "./types";

/**
 * Evolucion de un estudiante: el promedio de sus partidas en cada semana (de lunes a
 * domingo) o en cada mes calendario, juego por juego. Cada partida se ubica en el periodo
 * en que empezo. Es lo unico que se promedia: los demas graficos de «Desempeño» usan
 * la mediana, que un tiempo muy largo no distorsiona.
 */

export const EVOLUTION_SPANS: Record<EvolutionBy, EvolutionSpan[]> = {
  week: ["1", "2", "3", "6", "all"],
  month: ["3", "6", "9", "12", "all"],
};

/** Tope de periodos dibujados con «todo el tiempo»: mas que esto no se lee en un grafico. */
const MAX_PERIODS: Record<EvolutionBy, number> = { week: 104, month: 60 };

const GAMES: GameId[] = ["color-sequence", "node-connection", "mini-cases"];

const SPAN_TEXT: Record<EvolutionSpan, string> = {
  "1": "último mes",
  "2": "últimos 2 meses",
  "3": "últimos 3 meses",
  "6": "últimos 6 meses",
  "9": "últimos 9 meses",
  "12": "últimos 12 meses",
  all: "todo el tiempo",
};

export type EvolutionQueryResult =
  | { ok: true; by: EvolutionBy; span: EvolutionSpan }
  | { ok: false; message: string };

export function parseEvolutionQuery(raw: { by?: unknown; span?: unknown }): EvolutionQueryResult {
  const by = raw.by === "week" || raw.by === "month" ? raw.by : null;

  if (by === null) return { ok: false, message: "Indica si el promedio es por semana o por mes." };

  const span = EVOLUTION_SPANS[by].find((value) => value === raw.span);

  if (span === undefined) return { ok: false, message: "El período pedido no es válido." };

  return { ok: true, by, span };
}

/** Un instante a mediodia (hora de Chile) del dia indicado: evita los bordes de cambio de dia. */
function noonOf(year: number, month: number, day: number): Date {
  return chileLocalToUtc(year, month, day, 12, 0);
}

/** La clave del primer periodo que se dibuja; null si no hay con que partir (sin partidas en «todo el tiempo»). */
function firstKey(by: EvolutionBy, span: EvolutionSpan, attempts: AttemptRow[], now: Date): string | null {
  if (span === "all") {
    if (attempts.length === 0) return null;

    const first = attempts.reduce((a, b) => (b.startedAt < a.startedAt ? b : a));

    return bucketKey(first.startedAt, by);
  }

  const months = Number(span);
  const today = chileDay(now);

  if (by === "week") {
    // «Ultimo mes» = desde hace un mes (misma fecha); la semana que lo contiene entra completa.
    const back = new Date(Date.UTC(today.year, today.month - 1 - months, today.day));

    return bucketKey(noonOf(back.getUTCFullYear(), back.getUTCMonth() + 1, back.getUTCDate()), "week");
  }

  // Meses calendario: el actual (en curso) y los anteriores hasta completar la cantidad pedida.
  const back = new Date(Date.UTC(today.year, today.month - 1 - (months - 1), 1));

  return bucketKey(noonOf(back.getUTCFullYear(), back.getUTCMonth() + 1, 1), "month");
}

function periodKeys(by: EvolutionBy, span: EvolutionSpan, attempts: AttemptRow[], now: Date): string[] {
  const first = firstKey(by, span, attempts, now);

  if (first === null) return [];

  const last = bucketKey(now, by);
  const keys: string[] = [];

  for (let key = first; key <= last; key = nextBucketKey(key, by)) keys.push(key);

  return keys.slice(-MAX_PERIODS[by]);
}

type Metric = {
  id: ChartId;
  title: string;
  description: string;
  unit: "count" | "level" | "seconds" | "steps";
  unitLabel: string;
  yLabel: string;
  /** El valor de una partida; null si no tiene datos para esta cifra. */
  of: (attempt: AttemptRow, own: ResultRow[]) => number | null;
  /** Cuenta partidas (no promedia): un periodo sin partidas vale 0, no «sin dato». */
  counts?: boolean;
  notes: string[];
};

const SERIES_NOTE =
  "Cada partida se ubica en el período en que empezó, sea cual sea cómo terminó (terminada, fallida o sin terminar).";

function metricsOf(game: GameId): Metric[] {
  const count: Metric = {
    id: "ev-count",
    title: "Partidas jugadas",
    description: "Cuántas partidas de este juego empezó en cada período. Sirve para saber cuánto jugó y cuánta información hay detrás de los promedios.",
    unit: "count",
    unitLabel: "partidas",
    yLabel: "Partidas",
    of: () => 1,
    counts: true,
    notes: ["Cuenta las partidas que empezó en cada período.", SERIES_NOTE],
  };

  if (game === "mini-cases") {
    return [
      count,
      {
        id: "ev-steps",
        title: "Pasos correctos por caso",
        description:
          "El promedio de pasos que puso en su lugar correcto en cada caso (de 0 a 4), promediado entre las partidas de cada período.",
        unit: "steps",
        unitLabel: "pasos",
        yLabel: "Pasos correctos (promedio)",
        of: (_, own) => mean(own.map((r) => num(r.metrics.correctSteps))),
        notes: [
          "Para cada partida se promedian los pasos correctos de sus casos; el punto es el promedio de esas partidas.",
          "Entran las partidas que guardaron al menos un caso. " + SERIES_NOTE,
        ],
      },
      {
        id: "ev-time",
        title: "Tiempo de decisión por caso",
        description:
          "El promedio de cuánto tardó en decidir el orden de los pasos de cada caso, promediado entre las partidas de cada período.",
        unit: "seconds",
        unitLabel: "segundos",
        yLabel: "Segundos (promedio)",
        of: (_, own) => mean(own.map((r) => r.activeMsNet / 1000)),
        notes: [
          "Para cada partida se promedia el tiempo activo de sus casos (sin pausas largas); el punto es el promedio de esas partidas.",
          "Entran las partidas que guardaron al menos un caso. " + SERIES_NOTE,
        ],
      },
    ];
  }

  const verb = "superó";

  return [
    count,
    {
      id: "ev-level",
      title: "Nivel más alto por partida",
      description: `El promedio del nivel más alto que ${verb} en cada partida, promediado entre las partidas de cada período.`,
      unit: "level",
      unitLabel: "nivel",
      yLabel: "Nivel más alto (promedio)",
      of: (attempt, own) => (own.length === 0 ? null : bestLevelOf(own, attempt.gameId)),
      notes: [
        `Para cada partida se toma el nivel más alto que ${verb}; el punto es el promedio de esas partidas.`,
        "Entran las partidas que guardaron al menos un resultado. " + SERIES_NOTE,
      ],
    },
    {
      id: "ev-time",
      title: "Tiempo por nivel",
      description:
        "El promedio de cuánto tardó en cada nivel (solo el primer intento), promediado entre las partidas de cada período.",
      unit: "seconds",
      unitLabel: "segundos",
      yLabel: "Segundos (promedio)",
      of: (_, own) => mean(own.filter((r) => isFirstTryTime(r)).map((r) => r.activeMsNet / 1000)),
      notes: [
        "Para cada partida se promedia el tiempo activo del primer intento de sus niveles (sin pausas largas); el punto es el promedio de esas partidas.",
        ...(game === "color-sequence"
          ? ["Los niveles más altos piden más, así que una partida que llega más lejos tiende a promediar más segundos."]
          : []),
        "Entran las partidas que guardaron al menos un resultado. " + SERIES_NOTE,
      ],
    },
  ];
}

export function buildEvolution(
  rut: string,
  attempts: AttemptRow[],
  results: ResultRow[],
  by: EvolutionBy,
  span: EvolutionSpan,
  now: Date = new Date(),
): StudentEvolution {
  const mine = attempts.filter((a) => a.studentRut === rut);
  const ownResults = results.filter((r) => r.studentRut === rut);
  const keys = periodKeys(by, span, mine, now);
  const inRange = new Set(keys);
  const periodWord = by === "week" ? "semana" : "mes";

  const games = GAMES.map((game) => {
    const gameAttempts = mine.filter((a) => a.gameId === game);
    const inPeriods = gameAttempts.filter((a) => inRange.has(bucketKey(a.startedAt, by)));
    const charts: StudentProfileChart[] = [];

    if (inPeriods.length > 0) {
      for (const metric of metricsOf(game)) {
        const perKey = new Map<string, number[]>();

        for (const attempt of inPeriods) {
          const own = ownResults.filter((r) => r.attemptId === attempt.attemptId);
          const value = metric.of(attempt, own);

          if (value === null) continue;

          const key = bucketKey(attempt.startedAt, by);

          perKey.set(key, [...(perKey.get(key) ?? []), value]);
        }

        const values = keys.map((key) => {
          const list = perKey.get(key) ?? [];

          if (metric.counts) return list.length;

          return list.length === 0 ? null : round(mean(list), 1);
        });
        const ns = keys.map((key) => perKey.get(key)?.length ?? 0);
        const used = ns.reduce((a, b) => a + b, 0);

        const result = {
          ...emptyResult(metric.id, metric.title, now),
          views: ["lines" as const, "bars" as const],
          xLabel: by === "week" ? "Semana (de lunes a domingo; se indica el lunes)" : "Mes",
          yLabel: metric.yLabel,
          unit: metric.unit,
          unitLabel: metric.unitLabel,
          basis: `${used} ${used === 1 ? "partida" : "partidas"} de ${GAME_LABELS[game]}, agrupadas por ${periodWord}.`,
          // Semanas: solo el dia del lunes («21 sep»); el eje aclara que es el lunes de cada semana.
          categories: keys.map((key) => bucketLabel(key, by === "week" ? "day" : "month")),
          series: [
            {
              key: metric.id,
              label: metric.yLabel,
              slot: GAMES.indexOf(game),
              n: used,
              values,
              ns,
            },
          ],
          notes: [
            ...metric.notes,
            by === "week"
              ? "Las semanas van de lunes a domingo."
              : "Los meses son meses calendario.",
            metric.counts
              ? "El último período está en curso."
              : `Un ${periodWord} sin partidas con datos queda sin punto: no se cuenta como cero. El último período está en curso.`,
          ],
          deduction: [deductionOf(metric.id, true), metric.id === "ev-time" && game === "color-sequence" ? SERIATION_TIME_CAUTION : null]
            .filter((text): text is string => typeof text === "string")
            .join(" "),
        };

        charts.push({ id: metric.id, title: metric.title, description: metric.description, result });
      }
    }

    return {
      game,
      label: GAME_LABELS[game],
      played: gameAttempts.length > 0,
      partidas: inPeriods.length,
      charts,
    };
  });

  return {
    by,
    span,
    label: `Promedios por ${periodWord} · ${SPAN_TEXT[span]}`,
    games,
    notes:
      span === "all" && keys.length >= MAX_PERIODS[by]
        ? [`Con «todo el tiempo» se dibujan los últimos ${MAX_PERIODS[by]} ${by === "week" ? "semanas" : "meses"}.`]
        : [],
    generatedAt: now.toISOString(),
  };
}
