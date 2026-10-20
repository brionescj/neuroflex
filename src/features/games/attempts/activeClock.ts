/**
 * Reloj de tiempo ACTIVO de un nivel o caso. Lleva dos cuentas:
 *
 *  - bruto: tiempo con la pestana visible (se pausa al ocultarla).
 *  - neto: el bruto menos la inactividad. Cuando pasan mas de `idleMs` sin
 *    que el estudiante toque nada, lo que excede ese umbral no cuenta (los
 *    primeros `idleMs` si: pensar un rato es parte de la tarea).
 *
 * Es una funcion pura de un reloj inyectado (`now`) para poder probarla sin
 * esperar. El hook useActiveClock la conecta a los eventos del navegador.
 */

/** Inactividad a partir de la cual el tiempo deja de contar en el neto. */
export const IDLE_LIMIT_MS = 80_000;

export type ClockReading = {
  grossMs: number;
  netMs: number;
};

export type ActiveClock = {
  /** Pone todo en cero y detiene el reloj. */
  reset: () => void;
  /** Continua desde lo acumulado (al reanudar una partida). */
  restore: (grossMs: number, netMs: number) => void;
  start: () => void;
  pause: () => void;
  /** El estudiante hizo algo: corta la cuenta de inactividad. */
  touch: () => void;
  read: () => ClockReading;
  isRunning: () => boolean;
};

export function createActiveClock(
  now: () => number,
  idleMs: number = IDLE_LIMIT_MS,
): ActiveClock {
  let grossBase = 0;
  let discardedBase = 0;
  let segmentStart: number | null = null;
  let lastTouch = 0;

  // Inactividad por encima del umbral desde el ultimo toque (o desde que
  // arranco el tramo, lo que ocurra despues).
  function excessAt(at: number): number {
    if (segmentStart === null) return 0;

    const idle = at - Math.max(lastTouch, segmentStart);

    return Math.max(0, idle - idleMs);
  }

  return {
    reset() {
      grossBase = 0;
      discardedBase = 0;
      segmentStart = null;
    },

    restore(grossMs, netMs) {
      const gross = Math.max(0, grossMs);

      grossBase = gross;
      discardedBase = Math.max(0, gross - Math.max(0, netMs));
      segmentStart = null;
    },

    start() {
      if (segmentStart !== null) return;

      segmentStart = now();
      lastTouch = segmentStart;
    },

    pause() {
      if (segmentStart === null) return;

      const at = now();

      discardedBase += excessAt(at);
      grossBase += Math.max(0, at - segmentStart);
      segmentStart = null;
    },

    touch() {
      if (segmentStart === null) return;

      const at = now();

      discardedBase += excessAt(at);
      lastTouch = at;
    },

    read() {
      const at = now();
      const running = segmentStart === null ? 0 : Math.max(0, at - segmentStart);
      const grossMs = grossBase + running;
      const netMs = Math.max(0, grossMs - discardedBase - excessAt(at));

      return { grossMs: Math.round(grossMs), netMs: Math.round(netMs) };
    },

    isRunning() {
      return segmentStart !== null;
    },
  };
}
