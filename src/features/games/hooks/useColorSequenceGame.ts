import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SequenceColorId } from "../components/ColorGrid";
import { useActiveClock } from "../attempts/useActiveClock";
import { useGameAttempt } from "../attempts/useGameAttempt";
import {
  COLOR_SEQUENCE_CONTENT_VERSION,
  MIN_LEVELS,
  MIN_SEQUENCE_LENGTH,
  type LevelResult,
} from "./colorSequenceConfig";
import { buildSequence } from "./colorSequenceBuild";
import { toColorSequenceReport } from "./colorSequenceReport";
import {
  MAX_TRIES_PER_LEVEL,
  isLevelPassed,
  nextStepAfter,
} from "./colorSequenceRules";
import {
  buildColorSequenceSnapshot,
  parseColorSequenceProgress,
  type ColorSequenceProgress,
} from "./colorSequenceResume";
import { useGameProgress } from "./useGameProgress";

export { MAX_TRIES_PER_LEVEL, MIN_LEVELS, MIN_SEQUENCE_LENGTH };
export type { LevelResult };

const ILLUMINATE_ON_MS = 600;
const ILLUMINATE_GAP_MS = 300;

type GamePhase =
  | "idle"
  | "illuminating"
  | "answering"
  | "level-result"
  | "finished"
  | "failed";

/** Nivel mas alto que se paso (0 si ninguno). */
function maxLevelPassedOf(results: LevelResult[]): number {
  return results.reduce((max, r) => (r.passed ? Math.max(max, r.level) : max), 0);
}

function reportsOf(results: LevelResult[]) {
  const now = new Date().toISOString();

  return results.map((result) => toColorSequenceReport(result, now));
}

export function useColorSequenceGame() {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [level, setLevel] = useState(1);
  const [tryNumber, setTryNumber] = useState(1);
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
      setTryNumber(snapshot.tryNumber);
      setSequence(snapshot.sequence);
      setLevelResults(snapshot.levelResults);
      setActiveIndex(null);
      setPhase(snapshot.phase);
    },
    [attempt],
  );

  // Una partida terminada (o fallida) es definitiva: se archiva en la base
  // (por si el cierre no habia llegado) y se descarta el avance, de modo que
  // al volver a entrar se ofrece una partida nueva y no los resultados de la
  // anterior. Si no se logra archivar, se muestran los resultados y se
  // conserva todo.
  useEffect(() => {
    if (phase !== "idle" || progressStatus !== "ready") return;
    if (resumeSnapshot?.phase !== "finished" && resumeSnapshot?.phase !== "failed") {
      return;
    }
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
      .syncResults(
        reportsOf(resumeSnapshot.levelResults),
        resumeSnapshot.phase === "failed" ? "failed" : "finished",
      )
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
    resumeSnapshot.phase !== "finished" &&
    resumeSnapshot.phase !== "failed";

  // No se puede empezar de cero mientras exista un avance guardado, ni
  // mientras no se sepa si existe.
  const canStart = progressStatus === "ready" && resumeSnapshot === null;

  // Con la partida terminada o fallida ya se puede salir.
  const isGameInProgress =
    (phase !== "idle" && phase !== "finished" && phase !== "failed") ||
    hasResumable;

  const start = useCallback(() => {
    if (!canStart) return;

    attempt.begin();
    archivedRef.current = false;

    setLevel(1);
    setTryNumber(1);
    setLevelResults([]);
    setSequence(buildSequence(MIN_SEQUENCE_LENGTH));
    setPhase("illuminating");
  }, [canStart, attempt]);

  const resume = useCallback(() => {
    if (resumeSnapshot) applySnapshot(resumeSnapshot);
  }, [resumeSnapshot, applySnapshot]);

  const returnToStart = useCallback(() => {
    // El cierre sale en cola y se reintenta aunque se cambie de pantalla.
    void attempt.closeAttempt(phase === "failed" ? "failed" : "finished");
    clearProgress();
    archivedRef.current = false;
    setPhase("idle");
  }, [phase, attempt, clearProgress]);

  // Puntos de control: inicio de cada nivel, su resultado y el final.
  useEffect(() => {
    if (
      phase !== "illuminating" &&
      phase !== "level-result" &&
      phase !== "finished" &&
      phase !== "failed"
    ) {
      return;
    }
    if (sequence.length === 0) return;

    saveProgress(
      buildColorSequenceSnapshot(
        phase,
        level,
        tryNumber,
        sequence,
        levelResults,
        attempt.current() ?? undefined,
      ),
    );
  }, [phase, level, tryNumber, sequence, levelResults, saveProgress, attempt]);

  // El reloj del intento corre desde que empieza a iluminarse hasta que el
  // alumno completa la respuesta. Reanudar un intento lo reinicia desde cero.
  useEffect(() => {
    if (phase === "illuminating") {
      clock.reset();
      clock.start();
    }
  }, [phase, level, tryNumber, clock]);

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

      const passed = isLevelPassed(level, sequence.length, correctCount);

      const result: LevelResult = {
        level,
        tryNumber,
        passed,
        sequenceLength: sequence.length,
        correctCount,
        timeMs,
        activeMsGross: grossMs,
        activeMsNet: netMs,
        completedAt,
      };

      void attempt.reportLevel(toColorSequenceReport(result, completedAt));

      setLevelResults((prev) => [...prev, result]);

      const step = nextStepAfter(result);

      if (step === "restart" || step === "close") {
        // Sin intentos: la partida termina aqui. En un nivel obligatorio (1 a
        // 10) cuenta como fallida; desde el 11, como terminada.
        setPhase(step === "restart" ? "failed" : "finished");

        void attempt
          .closeAttempt(step === "restart" ? "failed" : "finished")
          .then((closed) => {
            if (closed) clearProgress();
          });

        return;
      }

      setPhase("level-result");
    },
    [phase, sequence, level, tryNumber, clock, attempt, clearProgress],
  );

  // Despues de ver el resultado: el nivel siguiente si se paso, o un
  // reintento si no. En ambos casos la secuencia es nueva (no la anterior
  // con un color mas): nunca la misma ni una que empiece igual.
  const continueAfterResult = useCallback(() => {
    const last = levelResults[levelResults.length - 1];

    if (!last) return;

    if (last.passed) {
      setLevel(last.level + 1);
      setTryNumber(1);
      setSequence((prev) => buildSequence(prev.length + 1, prev));
    } else {
      setTryNumber(last.tryNumber + 1);
      setSequence((prev) => buildSequence(prev.length, prev));
    }

    setPhase("illuminating");
  }, [levelResults]);

  // El juego no tiene tope: terminar es una decision del alumno, posible
  // una vez pasados los niveles obligatorios. Tambien desde la pantalla de
  // reanudar, para no obligar a retomar un nivel que ya no quiere jugar.
  const maxLevelPassed = maxLevelPassedOf(
    phase === "idle" ? (resumeSnapshot?.levelResults ?? []) : levelResults,
  );

  const canFinish =
    phase !== "finished" &&
    phase !== "failed" &&
    maxLevelPassed >= MIN_LEVELS &&
    (phase !== "idle" || hasResumable);

  const finish = useCallback(() => {
    if (!canFinish) return;

    if (phase === "idle" && resumeSnapshot) {
      attempt.adopt(resumeSnapshot.attempt);
      void attempt.syncResults(reportsOf(resumeSnapshot.levelResults));
      setLevel(resumeSnapshot.level);
      setTryNumber(resumeSnapshot.tryNumber);
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
    tryNumber,
    maxLevelPassed,
    sequence,
    activeIndex,
    levelResults,
    start,
    resume,
    returnToStart,
    registerAnswer,
    continueAfterResult,
    finish,
  };
}