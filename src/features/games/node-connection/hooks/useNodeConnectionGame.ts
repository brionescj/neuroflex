import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useActiveClock } from "@/features/games/attempts/useActiveClock";
import { useGameAttempt } from "@/features/games/attempts/useGameAttempt";
import { useGameProgress } from "@/features/games/hooks/useGameProgress";
import {
  advanceStroke,
  connectedCount,
  isPathComplete,
  isSolved,
  pointToCell,
  sameCell,
  startStroke,
} from "../board";
import { createNodeEventLog, type NodeEventLog } from "../events";
import { getLevel, TOTAL_LEVELS } from "../levels";
import {
  MAX_TRIES_PER_LEVEL,
  allowedErrors,
  errorCountsOf,
  errorsOf,
  isOverLimit,
  isTryPassed,
  nextStepAfter,
} from "../rules";
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
  NodeEvent,
  NodeLevelResult,
  NodePaths,
  NodeStats,
} from "../types";

/** Cada cuanto se guarda el avance mientras se juega, aunque no se toque nada. */
const HEARTBEAT_MS = 10_000;

const HISTORY_LIMIT = 100;

const BLOCKED_FLASH_MS = 250;

type GamePhase =
  | "idle"
  | "playing"
  | "level-complete"
  | "level-failed"
  | "finished"
  | "failed";

/** Nivel mas alto que se paso (0 si ninguno). */
function maxLevelPassedOf(results: NodeLevelResult[]): number {
  return results.reduce((max, r) => (r.passed ? Math.max(max, r.level) : max), 0);
}

const CONTENT_VERSION = nodeContentVersion();

/** Omit que reparte sobre una union (para no perder los campos de cada tipo). */
type DistributiveOmit<T, K extends keyof T> = T extends unknown
  ? Omit<T, K>
  : never;

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
  const [tryNumber, setTryNumber] = useState(1);
  // Errores del intento en curso (ver rules.ts), para el contador en pantalla.
  const [errors, setErrors] = useState(0);
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
  // Celdas que retrocedio el gesto en curso (lo registra el evento "end").
  const gestureBackCellsRef = useRef(0);
  // Bitacora del nivel en curso: cada accion con su tiempo activo.
  const eventLogRef = useRef<NodeEventLog>(createNodeEventLog());
  const blockedRef = useRef<Cell | null>(null);
  const blockedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const archivedRef = useRef(false);
  // El intento en curso ya se resolvio (paso o se agoto): ignora lo que llegue despues.
  const resolvedRef = useRef(false);

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
    flush: flushProgress,
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

  // Los contadores de errores del intento en curso (todo lo que se corrige cuenta).
  const currentCounts = useCallback(
    () =>
      errorCountsOf({
        undoCount: undoCountRef.current,
        resetCount: resetCountRef.current,
        stats: statsRef.current,
      }),
    [],
  );
  const currentErrors = useCallback(() => errorsOf(currentCounts()), [currentCounts]);

  const beginLevel = useCallback(
    (
      levelNumber: number,
      tryNumberValue: number,
      seed?: {
        paths: NodePaths;
        elapsedMs: number;
        netMs?: number;
        undoCount: number;
        resetCount: number;
        stats?: NodeStats;
        events?: NodeEvent[];
        eventsDropped?: number;
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
      resolvedRef.current = false;
      setErrors(currentErrors());
      gestureBacktrackedRef.current = false;
      gestureBackCellsRef.current = 0;
      eventLogRef.current = createNodeEventLog(
        seed
          ? { events: seed.events ?? [], dropped: seed.eventsDropped ?? 0 }
          : undefined,
      );
      clock.reset();

      if (seed) clock.restore(seed.elapsedMs, seed.netMs ?? seed.elapsedMs);

      clock.start();

      setLevel(levelNumber);
      setTryNumber(tryNumberValue);
      setPhase("playing");
    },
    [commitPaths, clock, currentErrors],
  );

  // Registra el resultado de un intento y decide que sigue segun las reglas:
  // siguiente nivel, reintento, o fin de la partida (fallida o terminada).
  const finalizeTry = useCallback(
    (result: NodeLevelResult, previous: NodeLevelResult[]) => {
      void attempt.reportLevel(
        toNodeReport(result, result.completedAt ?? new Date().toISOString()),
      );

      setResults([...previous, result]);
      setLevel(result.level);
      setTryNumber(result.tryNumber);

      const step = nextStepAfter(result);

      if (step === "next-level" || step === "complete") {
        setPhase("level-complete");
        return;
      }

      if (step === "retry") {
        setPhase("level-failed");
        return;
      }

      // Sin intentos: la partida termina aqui. En un nivel obligatorio (1 a
      // 10) cuenta como fallida; desde el 11, como terminada.
      const status = step === "restart" ? "failed" : "finished";

      setPhase(status);

      void attempt.closeAttempt(status).then((closed) => {
        if (closed) clearProgress();
      });
    },
    [attempt, clearProgress],
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

      const snapshotTry = snapshot.tryNumber ?? 1;

      setResults(snapshot.results);

      if (snapshot.phase !== "playing") {
        setLevel(snapshot.level);
        setTryNumber(snapshotTry);
        setPhase(snapshot.phase);
        return;
      }

      const pairCount = getLevel(snapshot.level).pairs.length;
      const solved = isSnapshotSolved(snapshot);
      const overLimit = isOverLimit(snapshot.level, pairCount, errorCountsOf(snapshot));

      // Si lo guardado ya era un tablero resuelto, o sin margen de errores, el
      // intento esta terminado.
      if (solved || overLimit) {
        const completedAt = new Date().toISOString();
        const result: NodeLevelResult = {
          level: snapshot.level,
          tryNumber: snapshotTry,
          solved,
          passed: isTryPassed({
            level: snapshot.level,
            pairCount,
            solved,
            ...errorCountsOf(snapshot),
          }),
          pairCount,
          timeMs: snapshot.elapsedMs,
          undoCount: snapshot.undoCount,
          resetCount: snapshot.resetCount,
          activeMsNet: snapshot.netMs ?? snapshot.elapsedMs,
          completedAt,
          ...(snapshot.stats ? { stats: snapshot.stats } : {}),
          ...(snapshot.events
            ? {
                events: snapshot.events,
                eventsDropped: snapshot.eventsDropped ?? 0,
              }
            : {}),
        };

        finalizeTry(result, snapshot.results);
        return;
      }

      beginLevel(snapshot.level, snapshotTry, {
        paths: deserializePaths(snapshot.paths),
        elapsedMs: snapshot.elapsedMs,
        netMs: snapshot.netMs,
        undoCount: snapshot.undoCount,
        resetCount: snapshot.resetCount,
        stats: snapshot.stats,
        events: snapshot.events,
        eventsDropped: snapshot.eventsDropped,
      });
    },
    [beginLevel, attempt, finalizeTry],
  );

  // Una partida terminada es definitiva: se archiva en la base (por si el
  // cierre no habia llegado) y se descarta el avance, de modo que al volver a
  // entrar se ofrece una partida nueva y no los resultados de la anterior.
  // Si no se logra archivar, se muestran los resultados y se conserva todo.
  // Una partida a medias espera a que el alumno apriete "Continuar": evita
  // que el reloj corra antes de que este mirando la pantalla.
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
        reportsOf(resumeSnapshot.results),
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

    setResults([]);
    beginLevel(1, 1);
  }, [canStart, attempt, beginLevel]);

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

  // Guarda el estado actual. Lo leen los efectos y los gestos; los trazos y
  // los contadores salen de refs (siempre al dia), la fase y los resultados
  // de la ultima renderizacion (solo cambian por transiciones que ya vuelven
  // a guardar).
  const persist = useCallback(() => {
    if (phase === "idle") return;
    // Un intento ya resuelto espera su cambio de fase: no se guarda como "en curso".
    if (phase === "playing" && resolvedRef.current) return;

    saveProgress(
      buildNodeConnectionSnapshot({
        phase,
        level,
        tryNumber,
        paths: pathsRef.current,
        elapsedMs: currentElapsed(),
        undoCount: undoCountRef.current,
        resetCount: resetCountRef.current,
        netMs: clock.read().netMs,
        stats: statsRef.current,
        events: eventLogRef.current.events(),
        eventsDropped: eventLogRef.current.dropped(),
        results,
        attempt: attempt.current() ?? undefined,
      }),
    );
  }, [
    phase,
    level,
    tryNumber,
    results,
    saveProgress,
    currentElapsed,
    clock,
    attempt,
  ]);

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

  // Cierra el gesto en curso. Retroceder cuenta como error en cuanto ocurre (una vez por
  // gesto, en pointerMove), no al soltar: asi el intento puede perderse en el acto.
  const endGesture = useCallback(() => {
    gestureBacktrackedRef.current = false;
  }, []);

  // Anota un evento con el tiempo activo del nivel (el mismo reloj que
  // `activeMsGross`, que sigue contando tras un F5).
  const record = useCallback(
    (event: DistributiveOmit<NodeEvent, "t">) => {
      eventLogRef.current.push({
        ...event,
        t: Math.round(clock.read().grossMs),
      } as NodeEvent);
    },
    [clock],
  );

  // Anota el fin del trazo en curso: largo, si conecto el par y cuanto
  // retrocedio. Se llama al soltar el dedo y al completar el nivel (el ultimo
  // trazo termina ahi, sin un "soltar" aparte).
  const recordStrokeEnd = useCallback(() => {
    const color = activeColorRef.current;

    if (!color) return;

    record({
      type: "end",
      color,
      len: pathsRef.current[color]?.length ?? 0,
      done: isPathComplete(levelData, pathsRef.current, color),
      back: gestureBackCellsRef.current,
    });
  }, [levelData, record]);

  // Cierra el intento en curso, resuelto o sin margen de errores. Es lo unico
  // que lo termina: una vez resuelto, los gestos que lleguen despues se ignoran.
  const resolveTry = useCallback(
    (solved: boolean) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;

      recordStrokeEnd();
      endGesture();
      clock.stop();
      const { grossMs, netMs } = clock.read();
      const completedAt = new Date().toISOString();

      const result: NodeLevelResult = {
        level,
        tryNumber,
        solved,
        passed: isTryPassed({
          level,
          pairCount: levelData.pairs.length,
          solved,
          ...currentCounts(),
        }),
        pairCount: levelData.pairs.length,
        timeMs: grossMs,
        undoCount: undoCountRef.current,
        resetCount: resetCountRef.current,
        activeMsNet: netMs,
        completedAt,
        stats: { ...statsRef.current },
        events: eventLogRef.current.events(),
        eventsDropped: eventLogRef.current.dropped(),
      };

      activeColorRef.current = null;
      setActiveColor(null);
      strokeBaseRef.current = null;

      finalizeTry(result, results);
    },
    [level, tryNumber, levelData, clock, results, endGesture, recordStrokeEnd, finalizeTry, currentCounts],
  );

  // Cuenta un error mas en pantalla y, si se acabo el margen, termina el intento.
  const syncErrors = useCallback(() => {
    const total = currentErrors();

    setErrors(total);

    if (total > allowedErrors(level, levelData.pairs.length)) resolveTry(false);
  }, [level, levelData, resolveTry, currentErrors]);

  const flashBlocked = useCallback((cell: Cell) => {
    const previous = blockedRef.current;

    if (!previous || !sameCell(previous, cell)) {
      blockedRef.current = cell;
      setBlockedCell(cell);
      statsRef.current = {
        ...statsRef.current,
        blockedCount: statsRef.current.blockedCount + 1,
      };
      record({ type: "blocked", row: cell.row, col: cell.col });
      syncErrors();

      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12);
      }
    }

    if (blockedTimerRef.current) clearTimeout(blockedTimerRef.current);

    blockedTimerRef.current = setTimeout(() => {
      blockedRef.current = null;
      setBlockedCell(null);
    }, BLOCKED_FLASH_MS);
  }, [record, syncErrors]);

  /**
   * Los tres gestos reciben la posicion del puntero en unidades de celda
   * (0..columnas, 0..filas), medida desde la esquina del tablero.
   */
  const pointerDown = useCallback(
    (fx: number, fy: number) => {
      if (phase !== "playing" || resolvedRef.current) return;

      const cell = pointToCell(levelData, fx, fy);
      const started = startStroke(levelData, pathsRef.current, cell);

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
      gestureBackCellsRef.current = 0;

      record({
        type: "start",
        color: started.color,
        row: cell.row,
        col: cell.col,
        ...(restarted > 0 ? { restartCells: restarted } : {}),
      });

      // Acortar o rehacer una ruta tocandola es un error: si agota el margen, el intento termina.
      if (restarted > 0) {
        syncErrors();
        if (resolvedRef.current) return;
      }

      strokeBaseRef.current = pathsRef.current;
      activeColorRef.current = started.color;
      setActiveColor(started.color);
      commitPaths(started.paths);
    },
    [phase, levelData, commitPaths, record, syncErrors],
  );

  const pointerMove = useCallback(
    (fx: number, fy: number) => {
      const color = activeColorRef.current;
      if (phase !== "playing" || resolvedRef.current || !color) return;

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

      let backtracked = false;

      if (next !== pathsRef.current) {
        // Un trazo solo borra celdas al volver sobre si mismo (retroceder).
        const erased = removedCells(levelData, pathsRef.current, next);

        if (erased > 0) {
          statsRef.current = {
            ...statsRef.current,
            backtrackCells: statsRef.current.backtrackCells + erased,
          };
          gestureBackCellsRef.current += erased;

          // Un gesto que retrocede cuenta un error, una sola vez aunque borre varias celdas.
          if (!gestureBacktrackedRef.current) {
            gestureBacktrackedRef.current = true;
            statsRef.current = {
              ...statsRef.current,
              backtrackGestures: statsRef.current.backtrackGestures + 1,
            };
            backtracked = true;
          }
        }

        commitPaths(next);
      }

      if (backtracked) syncErrors();
      if (resolvedRef.current) return;
      if (blockedAt) flashBlocked(blockedAt);

      if (isSolved(levelData, next)) resolveTry(true);
    },
    [phase, levelData, commitPaths, flashBlocked, resolveTry, syncErrors],
  );

  const pointerUp = useCallback(() => {
    if (!activeColorRef.current || resolvedRef.current) return;

    const base = strokeBaseRef.current;

    recordStrokeEnd();
    endGesture();
    activeColorRef.current = null;
    setActiveColor(null);
    strokeBaseRef.current = null;

    if (base && !samePaths(base, pathsRef.current)) {
      historyRef.current = [...historyRef.current, base].slice(-HISTORY_LIMIT);
      setCanUndo(true);
      persist();
    }
  }, [persist, endGesture, recordStrokeEnd]);

  const undo = useCallback(() => {
    if (phase !== "playing" || resolvedRef.current) return;

    const previous = historyRef.current[historyRef.current.length - 1];
    if (!previous) return;

    historyRef.current = historyRef.current.slice(0, -1);
    undoCountRef.current += 1;
    record({ type: "undo" });
    setCanUndo(historyRef.current.length > 0);
    commitPaths(previous);
    // Deshacer cuenta un error: si agota el margen, el intento termina.
    syncErrors();
    if (!resolvedRef.current) persist();
  }, [phase, commitPaths, persist, record, syncErrors]);

  // Reiniciar tambien se puede deshacer: un toque por error no pierde el trabajo.
  const reset = useCallback(() => {
    if (phase !== "playing" || resolvedRef.current) return;
    if (Object.keys(pathsRef.current).length === 0) return;

    historyRef.current = [...historyRef.current, pathsRef.current].slice(
      -HISTORY_LIMIT,
    );
    resetCountRef.current += 1;

    const erased = removedCells(levelData, pathsRef.current, {});

    statsRef.current = {
      ...statsRef.current,
      resetCells: statsRef.current.resetCells + erased,
    };
    record({ type: "reset", cells: erased });
    setCanUndo(true);
    commitPaths({});
    syncErrors();
    if (!resolvedRef.current) persist();
  }, [phase, levelData, commitPaths, persist, record, syncErrors]);

  const continueToNextLevel = useCallback(() => {
    if (level >= TOTAL_LEVELS) return;

    beginLevel(level + 1, 1);
  }, [level, beginLevel]);

  // Mismo tablero, intento nuevo y errores en cero.
  const retryLevel = useCallback(() => {
    if (tryNumber >= MAX_TRIES_PER_LEVEL) return;

    beginLevel(level, tryNumber + 1);
  }, [level, tryNumber, beginLevel]);

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
    resumeTry: resumeSnapshot?.tryNumber ?? 1,
    phase,
    level,
    tryNumber,
    maxTries: MAX_TRIES_PER_LEVEL,
    errors,
    errorsAllowed: allowedErrors(level, levelData.pairs.length),
    maxLevelPassed: maxLevelPassedOf(results),
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
    retryLevel,
    finish,
    flushProgress,
  };
}
