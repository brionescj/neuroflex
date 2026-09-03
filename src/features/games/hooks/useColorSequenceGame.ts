import { useCallback, useEffect, useRef, useState } from "react";

import {
  SEQUENCE_COLORS,
  type SequenceColorId,
} from "../components/ColorGrid";

export const MIN_SEQUENCE_LENGTH = 2;
export const MAX_SEQUENCE_LENGTH = 11;
export const TOTAL_LEVELS = MAX_SEQUENCE_LENGTH - MIN_SEQUENCE_LENGTH + 1;

const ILLUMINATE_ON_MS = 600;
const ILLUMINATE_GAP_MS = 300;

export type LevelResult = {
  level: number;
  sequenceLength: number;
  correctCount: number;
  timeMs: number;
};

type GamePhase =
  | "idle"
  | "illuminating"
  | "answering"
  | "level-result"
  | "finished";

function pickRandomColorId(exclude: Set<SequenceColorId>): SequenceColorId {
  const pool = SEQUENCE_COLORS.filter((color) => !exclude.has(color.id));
  const candidates = pool.length > 0 ? pool : SEQUENCE_COLORS;
  const index = Math.floor(Math.random() * candidates.length);
  const color = candidates[index];

  if (!color) {
    throw new Error("Indice fuera de rango en SEQUENCE_COLORS.");
  }

  return color.id;
}

/**
 * El color nuevo no puede repetir ninguno de los dos colores anteriores:
 * ni el inmediatamente previo (evita "rojo, rojo") ni el que esta dos
 * posiciones atras (evita el patron ABA tipo "amarillo, rojo, amarillo",
 * que es mas facil de recordar por la repeticion cercana).
 */
function nextColorId(previousSequence: SequenceColorId[]): SequenceColorId {
  const forbidden = new Set(previousSequence.slice(-2));
  return pickRandomColorId(forbidden);
}

function buildInitialSequence(length: number): SequenceColorId[] {
  const sequence: SequenceColorId[] = [];

  for (let i = 0; i < length; i++) {
    sequence.push(nextColorId(sequence));
  }

  return sequence;
}

export function useColorSequenceGame() {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<SequenceColorId[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [levelResults, setLevelResults] = useState<LevelResult[]>([]);

  const answersRef = useRef<SequenceColorId[]>([]);
  const firstClickAtRef = useRef<number | null>(null);

  const start = useCallback(() => {
    setLevel(1);
    setLevelResults([]);
    setSequence(buildInitialSequence(MIN_SEQUENCE_LENGTH));
    setPhase("illuminating");
  }, []);

  const returnToStart = useCallback(() => {
    setPhase("idle");
  }, []);

  useEffect(() => {
    if (phase !== "illuminating" || sequence.length === 0) {
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    sequence.forEach((_, index) => {
      const onAt = index * (ILLUMINATE_ON_MS + ILLUMINATE_GAP_MS);
      const offAt = onAt + ILLUMINATE_ON_MS;

      timers.push(
        setTimeout(() => {
          if (!cancelled) setActiveIndex(index);
        }, onAt),
      );

      timers.push(
        setTimeout(() => {
          if (!cancelled) setActiveIndex(null);
        }, offAt),
      );
    });

    const totalDuration =
      sequence.length * (ILLUMINATE_ON_MS + ILLUMINATE_GAP_MS);

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        answersRef.current = [];
        firstClickAtRef.current = null;
        setPhase("answering");
      }, totalDuration),
    );

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [phase, sequence]);

  const registerAnswer = useCallback(
    (colorId: SequenceColorId) => {
      if (phase !== "answering") {
        return;
      }

      if (answersRef.current.length === 0) {
        firstClickAtRef.current = Date.now();
      }

      answersRef.current = [...answersRef.current, colorId];

      if (answersRef.current.length < sequence.length) {
        return;
      }

      const correctCount = answersRef.current.filter(
        (answer, index) => answer === sequence[index],
      ).length;

      const timeMs = firstClickAtRef.current
        ? Date.now() - firstClickAtRef.current
        : 0;

      setLevelResults((prev) => [
        ...prev,
        { level, sequenceLength: sequence.length, correctCount, timeMs },
      ]);

      setPhase("level-result");
    },
    [phase, sequence, level],
  );

  const continueToNextLevel = useCallback(() => {
    setLevel((prev) => prev + 1);
    setSequence((prev) => [...prev, nextColorId(prev)]);
    setPhase("illuminating");
  }, []);

  const finish = useCallback(() => {
    setPhase("finished");
  }, []);

  return {
    phase,
    level,
    sequence,
    activeIndex,
    levelResults,
    start,
    returnToStart,
    registerAnswer,
    continueToNextLevel,
    finish,
  };
}