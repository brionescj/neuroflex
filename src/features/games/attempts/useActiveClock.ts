import { useEffect, useMemo, useRef } from "react";

import {
  createActiveClock,
  type ActiveClock,
  type ClockReading,
} from "./activeClock";

// Gestos que cuentan como "el estudiante esta ahi". Se escuchan en captura
// para que un stopPropagation del tablero no los esconda.
const INTERACTION_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "touchstart",
  "wheel",
] as const;

export type UseActiveClock = {
  reset: () => void;
  restore: (grossMs: number, netMs: number) => void;
  /** Empieza a contar; se pausa sola con la pestana oculta y sigue al volver. */
  start: () => void;
  stop: () => void;
  /** Para fases sin gestos del estudiante (ej. la secuencia que se ilumina). */
  touch: () => void;
  read: () => ClockReading;
};

/**
 * Conecta createActiveClock al navegador: pausa con la pestana oculta y
 * cuenta cada gesto como actividad. Devuelve siempre el mismo objeto.
 */
export function useActiveClock(): UseActiveClock {
  const clockRef = useRef<ActiveClock | null>(null);
  const wantedRef = useRef(false);

  if (clockRef.current === null) {
    clockRef.current = createActiveClock(Date.now);
  }

  const clock = clockRef.current;

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        clock.pause();
      } else if (wantedRef.current) {
        clock.start();
      }
    }

    function handleActivity() {
      clock.touch();
    }

    document.addEventListener("visibilitychange", handleVisibility);

    for (const type of INTERACTION_EVENTS) {
      document.addEventListener(type, handleActivity, {
        capture: true,
        passive: true,
      });
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);

      for (const type of INTERACTION_EVENTS) {
        document.removeEventListener(type, handleActivity, { capture: true });
      }
    };
  }, [clock]);

  return useMemo<UseActiveClock>(
    () => ({
      reset() {
        wantedRef.current = false;
        clock.reset();
      },
      restore(grossMs, netMs) {
        clock.restore(grossMs, netMs);
      },
      start() {
        wantedRef.current = true;

        if (!document.hidden) clock.start();
      },
      stop() {
        wantedRef.current = false;
        clock.pause();
      },
      touch() {
        clock.touch();
      },
      read() {
        return clock.read();
      },
    }),
    [clock],
  );
}
