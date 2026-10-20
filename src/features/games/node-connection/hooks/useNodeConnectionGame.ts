import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import {
  buildNodeConnectionSnapshot,
  deserializePaths,
  isSnapshotSolved,
  parseNodeConnectionProgress,
  serializePaths,
  type NodeConnectionProgress,
} from "../resume";
import type {
  Cell,
  NodeColorId,
  NodeLevelResult,
  NodePaths,
} from "../types";

/** Cada cuanto se guarda el avance mientras se juega, aunque no se toque nada. */
const HEARTBEAT_MS = 10_000;

const HISTORY_LIMIT = 100;

const BLOCKED_FLASH_MS = 250;

type GamePhase = "idle" | "playing" | "level-complete" | "finished";

function samePaths(a: NodePaths, b: NodePaths): boolean {
  return (
    JSON.stringify(serializePaths(a)) === JSON.stringify(serializePaths(b))
  );
}

export function useNodeConnectionGame() {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [level, setLevel] = useState(1);
  const [results, setResults] = useState<NodeLevelResult[]>([]);

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
  const blockedRef = useRef<Cell | null>(null);
  const blockedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reloj del nivel: tiempo activo acumulado + el tramo en curso. Se pausa
  // cuando la pestana queda oculta (bloqueo de pantalla, cambio de app).
  const elapsedBaseRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);

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

  const currentElapsed = useCallback(() => {
    const running =
      segmentStartRef.current === null
        ? 0
        : Math.max(0, Date.now() - segmentStartRef.current);

    return elapsedBaseRef.current + running;
  }, []);

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
        undoCount: number;
        resetCount: number;
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
      elapsedBaseRef.current = seed?.elapsedMs ?? 0;
      segmentStartRef.current = Date.now();

      setLevel(levelNumber);
      setPhase("playing");
    },
    [commitPaths],
  );

  const applySnapshot = useCallback(
    (snapshot: NodeConnectionProgress) => {
      setResults(snapshot.results);

      if (snapshot.phase !== "playing") {
        setLevel(snapshot.level);
        setPhase(snapshot.phase);
        return;
      }

      // Si lo guardado ya era un tablero resuelto, el nivel esta terminado.
      if (isSnapshotSolved(snapshot)) {
        const result: NodeLevelResult = {
          level: snapshot.level,
          pairCount: getLevel(snapshot.level).pairs.length,
          timeMs: snapshot.elapsedMs,
          undoCount: snapshot.undoCount,
          resetCount: snapshot.resetCount,
        };

        setResults([...snapshot.results, result]);
        setLevel(snapshot.level);
        setPhase("level-complete");
        return;
      }

      beginLevel(snapshot.level, {
        paths: deserializePaths(snapshot.paths),
        elapsedMs: snapshot.elapsedMs,
        undoCount: snapshot.undoCount,
        resetCount: snapshot.resetCount,
      });
    },
    [beginLevel],
  );

  // Una partida ya terminada se muestra sola. Una a medias espera a que el
  // alumno apriete "Continuar": evita que el reloj corra antes de que este
  // mirando la pantalla.
  useEffect(() => {
    if (phase !== "idle" || resumeSnapshot?.phase !== "finished") return;

    applySnapshot(resumeSnapshot);
  }, [phase, resumeSnapshot, applySnapshot]);

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

    setResults([]);
    beginLevel(1);
  }, [canStart, beginLevel]);

  const resume = useCallback(() => {
    if (resumeSnapshot) applySnapshot(resumeSnapshot);
  }, [resumeSnapshot, applySnapshot]);

  const returnToStart = useCallback(() => {
    clearProgress();
    setPhase("idle");
  }, [clearProgress]);

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
        results,
      }),
    );
  }, [phase, level, results, saveProgress, currentElapsed]);

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

  // Pestana oculta: se pausa el reloj y se guarda lo que hay, porque en un
  // movil es lo ultimo que se puede hacer antes de que el sistema la cierre.
  useEffect(() => {
    if (phase !== "playing") return;

    function handleVisibility() {
      if (document.hidden) {
        elapsedBaseRef.current = currentElapsed();
        segmentStartRef.current = null;
        persist();
      } else if (segmentStartRef.current === null) {
        segmentStartRef.current = Date.now();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [phase, persist, currentElapsed]);

  useEffect(
    () => () => {
      if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);
    },
    [],
  );

  const completeLevel = useCallback(() => {
    const result: NodeLevelResult = {
      level,
      pairCount: levelData.pairs.length,
      timeMs: Math.round(currentElapsed()),
      undoCount: undoCountRef.current,
      resetCount: resetCountRef.current,
    };

    activeColorRef.current = null;
    setActiveColor(null);
    strokeBaseRef.current = null;
    segmentStartRef.current = null;

    setResults((prev) => [...prev, result]);
    setPhase("level-complete");
  }, [level, levelData, currentElapsed]);

  const flashBlocked = useCallback((cell: Cell) => {
    const previous = blockedRef.current;

    if (!previous || !sameCell(previous, cell)) {
      blockedRef.current = cell;
      setBlockedCell(cell);

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

      if (next !== pathsRef.current) commitPaths(next);
      if (blockedAt) flashBlocked(blockedAt);

      if (isSolved(levelData, next)) completeLevel();
    },
    [phase, levelData, commitPaths, flashBlocked, completeLevel],
  );

  const pointerUp = useCallback(() => {
    if (!activeColorRef.current) return;

    const base = strokeBaseRef.current;

    activeColorRef.current = null;
    setActiveColor(null);
    strokeBaseRef.current = null;

    if (base && !samePaths(base, pathsRef.current)) {
      historyRef.current = [...historyRef.current, base].slice(-HISTORY_LIMIT);
      setCanUndo(true);
      persist();
    }
  }, [persist]);

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
    setCanUndo(true);
    commitPaths({});
    persist();
  }, [phase, commitPaths, persist]);

  const continueToNextLevel = useCallback(() => {
    if (level >= TOTAL_LEVELS) return;

    beginLevel(level + 1);
  }, [level, beginLevel]);

  const finish = useCallback(() => {
    setPhase("finished");
  }, []);

  const connected = useMemo(
    () => connectedCount(levelData, paths),
    [levelData, paths],
  );

  return {
    progressStatus,
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
