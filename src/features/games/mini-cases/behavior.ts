import type { MiniCaseBehavior, MiniCaseSelectionEvent } from "./types";

/** Tope de eventos de seleccion que se guardan por caso (los contadores siguen exactos). */
export const MAX_SELECTION_LOG = 60;

const MAX_COUNT = 1000;

/**
 * Lleva la cuenta de lo que hace el estudiante al ordenar un caso, para el
 * analisis: que opciones toco y en que momento, cuantas veces se arrepintio,
 * cuanto tardo en el giro de contexto y que distractor vio. Es informacion
 * de contexto; el puntaje lo calcula siempre el servidor.
 *
 * Es una funcion pura de un reloj inyectado (`now`) para poder probarla sin
 * esperar.
 */
export type BehaviorTracker = {
  /** El distractor que acaba de mostrarse: clave de la imagen y nombre del sonido (o «silenciado»). */
  noteDistractor: (image: string, sound: string) => void;
  /** Aparece el giro de contexto. */
  twistShown: () => void;
  /** El estudiante pasa al ordenamiento; `displayedOptionKeys` es el orden en que se le muestran. */
  beginOrdering: (displayedOptionKeys: string[]) => void;
  /** Agrego o quito una opcion; `activeMs` es el tiempo activo del ordenamiento en ese momento. */
  record: (optionKey: string, action: "add" | "remove", activeMs: number) => void;
  /** Lo observado en este caso (null si no se llego a ordenar). Repetirlo no cambia el resultado. */
  finish: () => MiniCaseBehavior | null;
};

export function createBehaviorTracker(
  now: () => number = Date.now,
): BehaviorTracker {
  let distractor: { motif: string | null; sound: string | null } = {
    motif: null,
    sound: null,
  };
  let twistShownAt: number | null = null;

  let ordering: {
    displayedOptionKeys: string[];
    twistReadMs: number | null;
    motif: string | null;
    sound: string | null;
    startedAt: number;
    taps: number;
    removals: number;
    firstTapMs: number | null;
    log: MiniCaseSelectionEvent[];
    wallMs: number | null;
  } | null = null;

  return {
    noteDistractor(image, sound) {
      distractor = { motif: image, sound };
    },

    twistShown() {
      twistShownAt = now();
    },

    beginOrdering(displayedOptionKeys) {
      const startedAt = now();

      ordering = {
        displayedOptionKeys: [...displayedOptionKeys],
        twistReadMs: twistShownAt === null ? null : startedAt - twistShownAt,
        motif: distractor.motif,
        sound: distractor.sound,
        startedAt,
        taps: 0,
        removals: 0,
        firstTapMs: null,
        log: [],
        wallMs: null,
      };
    },

    record(optionKey, action, activeMs) {
      if (!ordering) return;

      if (action === "add") {
        ordering.taps += 1;
        if (ordering.firstTapMs === null) ordering.firstTapMs = activeMs;
      } else {
        ordering.removals += 1;
      }

      if (ordering.log.length < MAX_SELECTION_LOG) {
        ordering.log.push({ o: optionKey, a: action, t: activeMs });
      }
    },

    finish() {
      if (!ordering) return null;

      // El tiempo real hasta el primer envio: reintentar un envio fallido no lo alarga.
      if (ordering.wallMs === null) ordering.wallMs = now() - ordering.startedAt;

      return {
        displayedOptionKeys: ordering.displayedOptionKeys,
        taps: ordering.taps,
        removals: ordering.removals,
        firstTapMs: ordering.firstTapMs,
        twistReadMs: ordering.twistReadMs,
        wallMs: ordering.wallMs,
        distractorMotif: ordering.motif,
        distractorSound: ordering.sound,
        selectionLog: ordering.log.map((e) => ({ ...e })),
      };
    },
  };
}

function isCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_COUNT
  );
}

function isTime(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function timeOrNull(value: unknown): number | null {
  return isTime(value) ? value : null;
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value.slice(0, 40) : null;
}

function isEvent(value: unknown): value is MiniCaseSelectionEvent {
  if (typeof value !== "object" || value === null) return false;

  const e = value as Record<string, unknown>;

  return (
    typeof e.o === "string" &&
    (e.a === "add" || e.a === "remove") &&
    isTime(e.t)
  );
}

/**
 * Valida el comportamiento guardado en un avance (puede estar corrupto o
 * ser de una version anterior). Devuelve null si no tiene la forma esperada.
 */
export function parseBehavior(raw: unknown): MiniCaseBehavior | null {
  if (typeof raw !== "object" || raw === null) return null;

  const r = raw as Record<string, unknown>;

  if (
    !Array.isArray(r.displayedOptionKeys) ||
    r.displayedOptionKeys.length !== 4 ||
    !r.displayedOptionKeys.every((k) => typeof k === "string") ||
    !isCount(r.taps) ||
    !isCount(r.removals) ||
    !isTime(r.wallMs) ||
    !Array.isArray(r.selectionLog)
  ) {
    return null;
  }

  return {
    displayedOptionKeys: r.displayedOptionKeys as string[],
    taps: r.taps,
    removals: r.removals,
    firstTapMs: timeOrNull(r.firstTapMs),
    twistReadMs: timeOrNull(r.twistReadMs),
    wallMs: r.wallMs,
    distractorMotif: textOrNull(r.distractorMotif),
    distractorSound: textOrNull(r.distractorSound),
    selectionLog: r.selectionLog
      .filter(isEvent)
      .slice(0, MAX_SELECTION_LOG)
      .map((e) => ({ o: e.o, a: e.a, t: e.t })),
  };
}
