import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useActiveClock } from "@/features/games/attempts/useActiveClock";
import { useGameAttempt } from "@/features/games/attempts/useGameAttempt";
import { useGameProgress } from "@/features/games/hooks/useGameProgress";
import {
  advanceStroke,
  connectedCount,
  isSolved,
  pointToCell,
  sameCell,
  startStroke,
} from "../board";
import { getLevel, TOTAL_LEVELS } from "../levels";
import { emptyStats, removedCells } from "../stats";
import {
  buildNodeConnectionSnapshot,
  deserializePaths,
  isSnapshotSolved,
  parseNodeConnectionProgress,
  serializePaths,
  type NodeConnectionProgress,
} from "../resume";
import { nodeContentVersion, toNodeReport } from "./nodeReport";
import type {
  Cell,
  NodeColorId,
  NodeLevelResult,
  NodePaths,
  NodeStats,
} from "../types";

/** Cada cuanto se guarda el avance mientras se juega, aunque no se toque nada. */
const HEARTBEAT_MS = 10_000;

const HISTORY_LIMIT = 100;

const BLOCKED_FLASH_MS = 250;

type GamePhase = "idle" | "playing" | "level-complete" | "finished";

const CONTENT_VERSION = nodeContentVersion();

function reportsOf(results: NodeLevelResult[]) {
  const now = new Date().toISOString();

  return results.map((result) => toNodeReport(result, now));
}

function samePaths(a: NodePaths, b: NodePaths): boolean {
  return (
    JSON.stringify(serializePaths(a)) === JSON.stringify(serializePaths(b))
  );
}

export function useNodeConnectionGame() {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [level, setLevel] = useState(1);
  const [results, setResults] = useState<NodeLevelResult[]>([]);

  // Una partida ya terminada que se esta archivando antes de empezar otra.
  const [archiving, setArchiving] = useState(false);

  // Lo que se dibuja. La logica del gesto lee pathsRef, no este estado: los
  // eventos del puntero llegan mas rapido que los renders y con el estado
  // se perderian pasos.
  const [paths, setPaths] = useState<NodePaths>({});
  const [activeColor, setActiveColor] = useState<NodeColorId | null>(null);
  const [blockedCell, setBlockedCell] = useState<Cell | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  const pathsRef = useRef<NodePaths>({});
  const activeColorRef = useRef<NodeColorId | null>(null);
  const strokeBaseRef = useRef<NodePaths | null>(null);
  const historyRef = useRef<NodePaths[]>([]);
  const undoCountRef = useRef(0);
  const resetCountRef = useRef(0);
  const statsRef = useRef<NodeStats>(emptyStats());
  // El gesto en curso (apoyar y soltar) retrocedio al menos una celda.
  const gestureBacktrackedRef = useRef(false);
  const blockedRef = useRef<Cell | null>(null);
  const blockedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const archivedRef = useRef(false);

  // Reloj del nivel: bruto (pestana visible) y neto (sin inactividad de mas
  // de 80 s). Se pausa solo cuando la pestana queda oculta.
  const clock = useActiveClock();
  const attempt = useGameAttempt("node-connection", CONTENT_VERSION);

  const {
    status: progressStatus,
    error: progressError,
    saved: savedProgress,
    reload: reloadProgress,
    save: saveProgress,
    clear: clearProgress,
  } = useGameProgress("node-connection");

  const levelData = getLevel(level);

  const resumeSnapshot: NodeConnectionProgress | null = useMemo(
    () => (savedProgress ? parseNodeConnectionProgress(savedProgress) : null),
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

  const currentElapsed = useCallback(() => clock.read().grossMs, [clock]);

  const commitPaths = useCallback((next: NodePaths) => {
    pathsRef.current = next;
    setPaths(next);
  }, []);

  const beginLevel = useCallback(
    (
      levelNumber: number,
      seed?: {
        paths: NodePaths;
        elapsedMs: number;
        netMs?: number;
        undoCount: number;
        resetCount: number;
        stats?: NodeStats;
      },
    ) => {
      commitPaths(seed?.paths ?? {});
      historyRef.current = [];
      setCanUndo(false);
      activeColorRef.current = null;
      setActiveColor(null);
      strokeBaseRef.current = null;
      undoCountRef.current = seed?.undoCount ?? 0;
      resetCountRef.current = seed?.resetCount ?? 0;
      statsRef.current = seed?.stats ? { ...seed.stats } : emptyStats();
      gestureBacktrackedRef.current = false;
      clock.reset();

      if (seed) clock.restore(seed.elapsedMs, seed.netMs ?? seed.elapsedMs);

      clock.start();

      setLevel(levelNumber);
      setPhase("playing");
    },
    [commitPaths, clock],
  );

  // `resync` es false cuando la partida ya se intento archivar y no se pudo:
  // repetir el envio solo alargaria la espera.
  const applySnapshot = useCallback(
    (snapshot: NodeConnectionProgress, resync = true) => {
      if (resync) {
        attempt.adopt(snapshot.attempt);
        // Lo que no hubiera llegado a la base antes llega ahora (es idempotente).
        void attempt.syncResults(reportsOf(snapshot.results));
      }

      setResults(snapshot.results);

      if (snapshot.phase !== "playing") {
        setLevel(snapshot.level);
        setPhase(snapshot.phase);
        return;
      }

      // Si lo guardado ya era un tablero resuelto, el nivel esta terminado.
      if (isSnapshotSolved(snapshot)) {
        const completedAt = new Date().toISOString();
        const result: NodeLevelResult = {
          level: snapshot.level,
          pairCount: getLevel(snapshot.level).pairs.length,
          timeMs: snapshot.elapsedMs,
          undoCount: snapshot.undoCount,
          resetCount: snapshot.resetCount,
          activeMsNet: snapshot.netMs ?? snapshot.elapsedMs,
          completedAt,
          ...(snapshot.stats ? { stats: snapshot.stats } : {}),
        };

        void attempt.reportLevel(toNodeReport(result, completedAt));
        setResults([...snapshot.results, result]);
        setLevel(snapshot.level);
        setPhase("level-complete");
        return;
      }

      beginLevel(snapshot.level, {
        paths: deserializePaths(snapshot.paths),
        elapsedMs: snapshot.elapsedMs,
        netMs: snapshot.netMs,
        undoCount: snapshot.undoCount,
        resetCount: snapshot.resetCount,
        stats: snapshot.stats,
      });
    },
    [beginLevel, attempt],
  );

  // Una partida terminada es definitiva: se archiva en la base (por si el
  // cierre no habia llegado) y se descarta el avance, de modo que al volver a
  // entrar se ofrece una partida nueva y no los resultados de la anterior.
  // Si no se logra archivar, se muestran los resultados y se conserva todo.
  // Una partida a medias espera a que el alumno apriete "Continuar": evita
  // que el reloj corra antes de que este mirando la pantalla.
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
      .syncResults(reportsOf(resumeSnapshot.results), "finished")
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

    setResults([]);
    beginLevel(1);
  }, [canStart, attempt, beginLevel]);

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

  // Guarda el estado actual. Lo leen los efectos y los gestos; los trazos y
  // los contadores salen de refs (siempre al dia), la fase y los resultados
  // de la ultima renderizacion (solo cambian por transiciones que ya vuelven
  // a guardar).
  const persist = useCallback(() => {
    if (phase === "idle") return;

    saveProgress(
      buildNodeConnectionSnapshot({
        phase,
        level,
        paths: pathsRef.current,
        elapsedMs: currentElapsed(),
        undoCount: undoCountRef.current,
        resetCount: resetCountRef.current,
        netMs: clock.read().netMs,
        stats: statsRef.current,
        results,
        attempt: attempt.current() ?? undefined,
      }),
    );
  }, [phase, level, results, saveProgress, currentElapsed, clock, attempt]);

  // Punto de control al empezar cada nivel, al terminarlo y al final.
  useEffect(() => {
    persist();
  }, [persist]);

  // Latido: mientras se juega, guardar cada pocos segundos acota cuanto
  // tiempo se pierde si la pagina se cierra de golpe.
  useEffect(() => {
    if (phase !== "playing") return;

    const id = setInterval(persist, HEARTBEAT_MS);

    return () => clearInterval(id);
  }, [phase, persist]);

  // Pestana oculta: el reloj se pausa solo; aqui se guarda lo que hay, porque en un
  // movil es lo ultimo que se puede hacer antes de que el sistema la cierre.
  useEffect(() => {
    if (phase !== "playing") return;

    function handleVisibility() {
      if (document.hidden) persist();
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [phase, persist]);

  useEffect(
    () => () => {
      if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
    },
    [],
  );

  // Cierra el gesto en curso: si retrocedio celdas cuenta como una correccion.
  const endGesture = useCallback(() => {
    if (gestureBacktrackedRef.current) {
      statsRef.current = {
        ...statsRef.current,
        backtrackGestures: statsRef.current.backtrackGestures + 1,
      };
      gestureBacktrackedRef.current = false;
    }
  }, []);

  const completeLevel = useCallback(() => {
    endGesture();
    clock.stop();
    const { grossMs, netMs } = clock.read();
    const completedAt = new Date().toISOString();

    const result: NodeLevelResult = {
      level,
      pairCount: levelData.pairs.length,
      timeMs: grossMs,
      undoCount: undoCountRef.current,
      resetCount: resetCountRef.current,
      activeMsNet: netMs,
      completedAt,
      stats: { ...statsRef.current },
    };

    activeColorRef.current = null;
    setActiveColor(null);
    strokeBaseRef.current = null;

    void attempt.reportLevel(toNodeReport(result, completedAt));

    setResults((prev) => [...prev, result]);
    setPhase("level-complete");
  }, [level, levelData, clock, attempt, endGesture]);

  const flashBlocked = useCallback((cell: Cell) => {
    const previous = blockedRef.current;

    if (!previous || !sameCell(previous, cell)) {
      blockedRef.current = cell;
      setBlockedCell(cell);
      statsRef.current = {
        ...statsRef.current,
        blockedCount: statsRef.current.blockedCount + 1,
      };

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
      }
    }

    if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);

    blockedTimerRef.current = setTimeout(() => {
      blockedRef.current = null;
      setBlockedCell(null);
    }, BLOCKED_FLASH_MS);
  }, []);

  /**
   * Los tres gestos reciben la posicion del puntero en unidades de celda
   * (0..columnas, 0..filas), medida desde la esquina del tablero.
   */
  const pointerDown = useCallback(
    (fx: number, fy: number) => {
      if (phase !== "playing") return;

      const started = startStroke(
        levelData,
        pathsRef.current,
        pointToCell(levelData, fx, fy),
      );

      if (!started) return;

      // Empezar de nuevo desde un nodo o una celda borra lo que estaba mas alla.
      const restarted = removedCells(levelData, pathsRef.current, started.paths);

      statsRef.current = {
        ...statsRef.current,
        strokesStarted: statsRef.current.strokesStarted + 1,
        ...(restarted > 0
          ? {
              routeRestarts: statsRef.current.routeRestarts + 1,
              restartCells: statsRef.current.restartCells + restarted,
            }
          : {}),
      };
      gestureBacktrackedRef.current = false;

      strokeBaseRef.current = pathsRef.current;
      activeColorRef.current = started.color;
      setActiveColor(started.color);
      commitPaths(started.paths);
    },
    [phase, levelData, commitPaths],
  );

  const pointerMove = useCallback(
    (fx: number, fy: number) => {
      const color = activeColorRef.current;
      if (phase !== "playing" || !color) return;

      const cells = pathsRef.current[color];
      const head = cells?.[cells.length - 1];
      if (!head) return;

      const target = pointToCell(levelData, fx, fy, head);
      if (sameCell(head, target)) return;

      const { paths: next, blockedAt } = advanceStroke(
        levelData,
        pathsRef.current,
        color,
        target,
      );

      if (next !== pathsRef.current) {
        // Un trazo solo borra celdas al volver sobre si mismo (retroceder).
        const erased = removedCells(levelData, pathsRef.current, next);

        if (erased > 0) {
          statsRef.current = {
            ...statsRef.current,
            backtrackCells: statsRef.current.backtrackCells + erased,
          };
          gestureBacktrackedRef.current = true;
        }

        commitPaths(next);
      }
      if (blockedAt) flashBlocked(blockedAt);

      if (isSolved(levelData, next)) completeLevel();
    },
    [phase, levelData, commitPaths, flashBlocked, completeLevel],
  );

  const pointerUp = useCallback(() => {
    if (!activeColorRef.current) return;

    const base = strokeBaseRef.current;

    endGesture();
    activeColorRef.current = null;
    setActiveColor(null);
    strokeBaseRef.current = null;

    if (base && !samePaths(base, pathsRef.current)) {
      historyRef.current = [...historyRef.current, base].slice(-HISTORY_LIMIT);
      setCanUndo(true);
      persist();
    }
  }, [persist, endGesture]);

  const undo = useCallback(() => {
    if (phase !== "playing") return;

    const previous = historyRef.current[historyRef.current.length - 1];
    if (!previous) return;

    historyRef.current = historyRef.current.slice(0, -1);
    undoCountRef.current += 1;
    setCanUndo(historyRef.current.length > 0);
    commitPaths(previous);
    persist();
  }, [phase, commitPaths, persist]);

  // Reiniciar tambien se puede deshacer: un toque por error no pierde el trabajo.
  const reset = useCallback(() => {
    if (phase !== "playing") return;
    if (Object.keys(pathsRef.current).length === 0) return;

    historyRef.current = [...historyRef.current, pathsRef.current].slice(
      -HISTORY_LIMIT,
    );
    resetCountRef.current += 1;
    statsRef.current = {
      ...statsRef.current,
      resetCells:
        statsRef.current.resetCells +
        removedCells(levelData, pathsRef.current, {}),
    };
    setCanUndo(true);
    commitPaths({});
    persist();
  }, [phase, levelData, commitPaths, persist]);

  const continueToNextLevel = useCallback(() => {
    if (level >= TOTAL_LEVELS) return;

    beginLevel(level + 1);
  }, [level, beginLevel]);

  const finish = useCallback(() => {
    setPhase("finished");

    // Con el cierre confirmado ya no hay nada que archivar al volver a entrar.
    void attempt.closeAttempt("finished").then((closed) => {
      if (closed) clearProgress();
    });
  }, [attempt, clearProgress]);

  const connected = useMemo(
    () => connectedCount(levelData, paths),
    [levelData, paths],
  );

  return {
    progressStatus: archiving ? ("loading" as const) : progressStatus,
    progressError,
    retryProgress: reloadProgress,
    canStart,
    hasResumable,
    isGameInProgress,
    resumeLevel: resumeSnapshot?.level ?? null,
    phase,
    level,
    totalLevels: TOTAL_LEVELS,
    levelData,
    paths,
    activeColor,
    blockedCell,
    canUndo,
    connected,
    results,
    start,
    resume,
    returnToStart,
    pointerDown,
    pointerMove,
    pointerUp,
    undo,
    reset,
    continueToNextLevel,
    finish,
  };
}
