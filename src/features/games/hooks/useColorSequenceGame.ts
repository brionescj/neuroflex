import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  SEQUENCE_COLORS,
  type SequenceColorId,
} from "../components/ColorGrid";
import { useActiveClock } from "../attempts/useActiveClock";
import { useGameAttempt } from "../attempts/useGameAttempt";
import {
  COLOR_SEQUENCE_CONTENT_VERSION,
  MIN_LEVELS,
  MIN_SEQUENCE_LENGTH,
  type LevelResult,
} from "./colorSequenceConfig";
import { toColorSequenceReport } from "./colorSequenceReport";
import {
  buildColorSequenceSnapshot,
  parseColorSequenceProgress,
  type ColorSequenceProgress,
} from "./colorSequenceResume";
import { useGameProgress } from "./useGameProgress";

export { MIN_LEVELS, MIN_SEQUENCE_LENGTH };
export type { LevelResult };

const ILLUMINATE_ON_MS = 600;
const ILLUMINATE_GAP_MS = 300;

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

function reportsOf(results: LevelResult[]) {
  const now = new Date().toISOString();

  return results.map((result) => toColorSequenceReport(result, now));
}

export function useColorSequenceGame() {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<SequenceColorId[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [levelResults, setLevelResults] = useState<LevelResult[]>([]);

  // Una partida ya terminada que se esta archivando antes de empezar otra.
  const [archiving, setArchiving] = useState(false);

  const answersRef = useRef<SequenceColorId[]>([]);
  const firstClickAtRef = useRef<number | null>(null);
  const archivedRef = useRef(false);

  const attempt = useGameAttempt("color-sequence", COLOR_SEQUENCE_CONTENT_VERSION);
  const clock = useActiveClock();

  const {
    status: progressStatus,
    error: progressError,
    saved: savedProgress,
    reload: reloadProgress,
    save: saveProgress,
    clear: clearProgress,
  } = useGameProgress("color-sequence");

  // Avance guardado ya validado (null si no hay o si esta corrupto).
  const resumeSnapshot: ColorSequenceProgress | null = useMemo(
    () => (savedProgress ? parseColorSequenceProgress(savedProgress) : null),
    [savedProgress],
  );

  // Un avance que no cuadra se descarta para no dejar al alumno bloqueado.
  // Solo en "idle": una partida en curso nunca debe borrarse por esto.
  useEffect(() => {
    if (phase !== "idle" || progressStatus !== "ready") return;

    if (savedProgress && !resumeSnapshot) {
      clearProgress();
    }
  }, [phase, progressStatus, savedProgress, resumeSnapshot, clearProgress]);

  // `resync` es false cuando la partida ya se intento archivar y no se pudo:
  // repetir el envio solo alargaria la espera.
  const applySnapshot = useCallback(
    (snapshot: ColorSequenceProgress, resync = true) => {
      if (resync) {
        attempt.adopt(snapshot.attempt);
        // Lo que no hubiera llegado a la base antes llega ahora (es idempotente).
        void attempt.syncResults(reportsOf(snapshot.levelResults));
      }

      setLevel(snapshot.level);
      setSequence(snapshot.sequence);
      setLevelResults(snapshot.levelResults);
      setActiveIndex(null);
      setPhase(snapshot.phase);
    },
    [attempt],
  );

  // Una partida terminada es definitiva: se archiva en la base (por si el
  // cierre no habia llegado) y se descarta el avance, de modo que al volver a
  // entrar se ofrece una partida nueva y no los resultados de la anterior.
  // Si no se logra archivar, se muestran los resultados y se conserva todo.
  useEffect(() => {
    if (phase !== "idle" || progressStatus !== "ready") return;
    if (resumeSnapshot?.phase !== "finished") return;
    if (archivedRef.current) return;

    archivedRef.current = true;
    setArchiving(true);

    const handle = attempt.adopt(resumeSnapshot.attempt);

    // Una partida anterior al registro no traia identificador: se deja
    // anotado el nuevo, para que recargar a mitad del archivado no abra otra.
    if (!resumeSnapshot.attempt) {
      saveProgress({ ...(savedProgress as object), attempt: handle });
    }

    void attempt
      .syncResults(reportsOf(resumeSnapshot.levelResults), "finished")
      .then((archived) => {
        setArchiving(false);

        if (archived) {
          clearProgress();
        } else {
          archivedRef.current = false;
          applySnapshot(resumeSnapshot, false);
        }
      });
  }, [
    phase,
    progressStatus,
    resumeSnapshot,
    savedProgress,
    attempt,
    saveProgress,
    clearProgress,
    applySnapshot,
  ]);

  const hasResumable =
    phase === "idle" &&
    resumeSnapshot !== null &&
    resumeSnapshot.phase !== "finished";

  // No se puede empezar de cero mientras exista un avance guardado, ni
  // mientras no se sepa si existe.
  const canStart = progressStatus === "ready" && resumeSnapshot === null;

  const isGameInProgress =
    (phase !== "idle" && phase !== "finished") || hasResumable;

  const start = useCallback(() => {
    if (!canStart) return;

    attempt.begin();
    archivedRef.current = false;

    setLevel(1);
    setLevelResults([]);
    setSequence(buildInitialSequence(MIN_SEQUENCE_LENGTH));
    setPhase("illuminating");
  }, [canStart, attempt]);

  const resume = useCallback(() => {
    if (resumeSnapshot) applySnapshot(resumeSnapshot);
  }, [resumeSnapshot, applySnapshot]);

  const returnToStart = useCallback(() => {
    // El cierre sale en cola y se reintenta aunque se cambie de pantalla.
    void attempt.closeAttempt("finished");
    clearProgress();
    archivedRef.current = false;
    setPhase("idle");
  }, [attempt, clearProgress]);

  // Puntos de control: inicio de cada nivel, su resultado y el final.
  useEffect(() => {
    if (
      phase !== "illuminating" &&
      phase !== "level-result" &&
      phase !== "finished"
    ) {
      return;
    }
    if (sequence.length === 0) return;

    saveProgress(
      buildColorSequenceSnapshot(
        phase,
        level,
        sequence,
        levelResults,
        attempt.current() ?? undefined,
      ),
    );
  }, [phase, level, sequence, levelResults, saveProgress, attempt]);

  // El reloj del nivel corre desde que empieza a iluminarse hasta que el
  // alumno completa la respuesta. Reanudar un nivel lo reinicia desde cero.
  useEffect(() => {
    if (phase === "illuminating") {
      clock.reset();
      clock.start();
    }
  }, [phase, level, clock]);

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
          if (cancelled) return;
          // El alumno solo mira: la secuencia que se ilumina cuenta como actividad.
          clock.touch();
          setActiveIndex(index);
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
  }, [phase, sequence, clock]);

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

      clock.stop();
      const { grossMs, netMs } = clock.read();

      const completedAt = new Date().toISOString();

      const result: LevelResult = {
        level,
        sequenceLength: sequence.length,
        correctCount,
        timeMs,
        activeMsGross: grossMs,
        activeMsNet: netMs,
        completedAt,
      };

      void attempt.reportLevel(toColorSequenceReport(result, completedAt));

      setLevelResults((prev) => [...prev, result]);
      setPhase("level-result");
    },
    [phase, sequence, level, clock, attempt],
  );

  const continueToNextLevel = useCallback(() => {
    setLevel((prev) => prev + 1);
    setSequence((prev) => [...prev, nextColorId(prev)]);
    setPhase("illuminating");
  }, []);

  // El juego no tiene tope: terminar es una decision del alumno, posible
  // una vez completados los niveles minimos. Tambien desde la pantalla de
  // reanudar, para no obligar a retomar un nivel que ya no quiere jugar.
  const completedLevels =
    phase === "idle"
      ? (resumeSnapshot?.levelResults.length ?? 0)
      : levelResults.length;

  const canFinish =
    phase !== "finished" &&
    completedLevels >= MIN_LEVELS &&
    (phase !== "idle" || hasResumable);

  const finish = useCallback(() => {
    if (!canFinish) return;

    if (phase === "idle" && resumeSnapshot) {
      attempt.adopt(resumeSnapshot.attempt);
      void attempt.syncResults(reportsOf(resumeSnapshot.levelResults));
      setLevel(resumeSnapshot.level);
      setSequence(resumeSnapshot.sequence);
      setLevelResults(resumeSnapshot.levelResults);
    }

    setActiveIndex(null);
    setPhase("finished");

    // Con el cierre confirmado ya no hay nada que archivar al volver a entrar.
    void attempt.closeAttempt("finished").then((closed) => {
      if (closed) clearProgress();
    });
  }, [canFinish, phase, resumeSnapshot, attempt, clearProgress]);

  return {
    progressStatus: archiving ? ("loading" as const) : progressStatus,
    progressError,
    retryProgress: reloadProgress,
    canStart,
    hasResumable,
    isGameInProgress,
    canFinish,
    resumeLevel: resumeSnapshot?.level ?? null,
    resumeLevelInProgress: resumeSnapshot?.phase === "illuminating",
    phase,
    level,
    sequence,
    activeIndex,
    levelResults,
    start,
    resume,
    returnToStart,
    registerAnswer,
    continueToNextLevel,
    finish,
  };
}