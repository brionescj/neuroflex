import { RotateCcw, Undo2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { BackToGameHub } from "@/features/games/components/BackToGameHub";
import { GameLeaseLostNotice } from "@/features/games/components/GameLeaseLostNotice";
import { SaveAndExitButton } from "@/features/games/components/SaveAndExitButton";
import { SoundToggle } from "@/features/games/components/SoundToggle";
import { useGameLease } from "@/features/games/hooks/useGameLease";
import { useLockNavigation } from "@/features/games/hooks/useLockNavigation";
import { GAME_GUARD_CLASS, useScreenshotDeterrents } from "@/features/games/hooks/useScreenshotDeterrents";
import { sounds, unlockSound } from "@/lib/gameSound";
import { useWarnBeforeUnload } from "@/features/games/hooks/useWarnBeforeUnload";
import { cellsErased, corrections } from "../stats";
import { useNodeConnectionGame } from "../hooks/useNodeConnectionGame";
import { NodeBoard } from "./NodeBoard";

export function NodeConnectionGame() {
  const navigate = useNavigate();

  const {
    progressStatus,
    progressError,
    retryProgress,
    canStart,
    hasResumable,
    isGameInProgress,
    resumeLevel,
    phase,
    level,
    totalLevels,
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
    flushProgress,
  } = useNodeConnectionGame();

  // Un juego se juega desde un solo lugar a la vez; y sin las vias faciles de copiar la pantalla.
  const { lost } = useGameLease("node-connection");

  useScreenshotDeterrents();

  // Mientras hay partida en curso (o una pendiente de continuar) el
  // Sidebar y "Cerrar sesion" quedan inhabilitados.
  useLockNavigation(isGameInProgress);

  // Advertencia (no bloqueo real, un navegador no lo permite) al intentar
  // cerrar la pestana o recargar mientras hay una partida en curso.
  useWarnBeforeUnload(phase !== "idle" && phase !== "finished");

  // Sonidos: tomar un nodo, unir un par (cada par unido suena mas agudo), chocar con otra linea
  // y completar el nivel.
  const previousConnected = useRef(0);
  const lastBlockedAt = useRef(0);
  const hadActiveColor = useRef(false);

  useEffect(() => {
    if (connected > previousConnected.current && phase === "playing") sounds.nodeJoin(connected);

    previousConnected.current = connected;
  }, [connected, phase]);

  useEffect(() => {
    if (!blockedCell || phase !== "playing") return;

    const now = Date.now();

    // Una linea que sigue contra un obstaculo no debe sonar a metralleta.
    if (now - lastBlockedAt.current > 400) sounds.lineBlocked();

    lastBlockedAt.current = now;
  }, [blockedCell, phase]);

  useEffect(() => {
    const hasActive = activeColor !== null && activeColor !== undefined;

    if (hasActive && !hadActiveColor.current) sounds.nodePick();

    hadActiveColor.current = hasActive;
  }, [activeColor]);

  useEffect(() => {
    if (phase === "level-complete") sounds.levelUp();
  }, [phase]);

  // El navegador solo deja sonar despues de un toque: Comenzar, Continuar y el tablero lo habilitan.
  function handleStart() {
    unlockSound();
    start();
  }

  function handleResume() {
    unlockSound();
    resume();
  }

  function handlePointerDown(fx: number, fy: number) {
    unlockSound();
    pointerDown(fx, fy);
  }

  function handleUndo() {
    sounds.lineUndone();
    undo();
  }

  function handleReset() {
    sounds.lineUndone();
    reset();
  }

  const lastResult = results[results.length - 1];
  const isLastLevel = level >= totalLevels;
  const totalPairs = levelData.pairs.length;

  return (
    <div className={`${GAME_GUARD_CLASS} flex w-full flex-col items-center gap-4`}>
      {lost && <GameLeaseLostNotice />}

      {phase === "idle" && !hasResumable && <BackToGameHub />}

      <h1 className="text-center text-2xl font-bold sm:text-3xl md:text-4xl">
        Conexión de nodos
      </h1>

      {phase === "idle" && (
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-6 text-center">
          <p className="text-sm text-zinc-300">
            {hasResumable
              ? `Tienes una partida en curso: vas en el nivel ${resumeLevel} de ${totalLevels}.`
              : "Une cada par de nodos del mismo color sin que las líneas se crucen."}
          </p>

          {!hasResumable && (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-left text-sm text-zinc-400">
              <li>Toca un nodo y arrastra hasta su pareja.</li>
              <li>Una línea no puede pasar por otro trazo ni por otro nodo.</li>
              <li>
                Si una ruta bloquea a otra, toca su trazo para acortarlo o usa
                Deshacer.
              </li>
            </ul>
          )}

          {canStart && (
            <button
              type="button"
              onClick={handleStart}
              className="min-h-12 rounded-full bg-white px-8 py-3 text-lg font-semibold text-black shadow-lg hover:bg-zinc-200"
            >
              Comenzar
            </button>
          )}

          {hasResumable && (
            <button
              type="button"
              onClick={handleResume}
              className="min-h-12 rounded-full bg-white px-8 py-3 text-lg font-semibold text-black shadow-lg hover:bg-zinc-200"
            >
              Continuar
            </button>
          )}

          {progressStatus === "error" && (
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-rose-400">
                {progressError ?? "No se pudo verificar tu avance guardado."}
              </p>
              <button
                type="button"
                onClick={retryProgress}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Reintentar
              </button>
            </div>
          )}

          {progressStatus === "loading" && (
            <p className="text-sm text-zinc-500">Cargando...</p>
          )}
        </div>
      )}

      {phase === "playing" && (
        <>
          <p
            className="text-center text-sm text-zinc-400"
            aria-live="polite"
          >
            Nivel {level} de {totalLevels} — pares conectados {connected} de{" "}
            {totalPairs}
          </p>

          <div
            className="w-full"
            style={{ maxWidth: "min(34rem, 62vh)" }}
          >
            <NodeBoard
              key={level}
              level={levelData}
              paths={paths}
              activeColor={activeColor}
              blockedCell={blockedCell}
              onPointerDown={handlePointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
            />
          </div>

          <div
            className="flex w-full gap-3"
            style={{ maxWidth: "min(34rem, 62vh)" }}
          >
            <button
              type="button"
              onClick={handleUndo}
              disabled={!canUndo}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Undo2 className="size-4" />
              Deshacer
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            >
              <RotateCcw className="size-4" />
              Rehacer tablero
            </button>
          </div>
        </>
      )}

      {phase === "level-complete" && lastResult && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-8 text-center">
          <p className="text-sm text-zinc-400">
            Nivel {lastResult.level} de {totalLevels}
          </p>

          <p className="text-lg font-semibold text-white">
            Nivel completado
          </p>

          <button
            type="button"
            onClick={isLastLevel ? finish : continueToNextLevel}
            className="mt-1 min-h-12 px-4 text-sm font-medium text-sky-400 hover:text-sky-300"
          >
            {isLastLevel ? "Ver resultado final" : "Siguiente nivel"}
          </button>
        </div>
      )}

      {phase === "finished" && (
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-center sm:max-w-md lg:max-w-lg">
          <p className="text-lg font-semibold text-white">
            Entrenamiento completo
          </p>

          <table className="w-full text-left text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-1 font-normal">Nivel</th>
                <th className="py-1 font-normal">Pares</th>
                <th className="py-1 font-normal">Correcciones</th>
                <th className="py-1 font-normal">Borradas</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr
                  key={r.level}
                  className="border-b border-zinc-800/50 last:border-0"
                >
                  <td className="py-1 text-white">{r.level}</td>
                  <td className="py-1">{r.pairCount}</td>
                  <td className="py-1">{corrections(r)}</td>
                  <td className="py-1">
                    {r.stats ? cellsErased(r.stats) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={returnToStart}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200"
            >
              Volver a jugar
            </button>

            <button
              type="button"
              onClick={() => navigate(ROUTES.STUDENT)}
              className="rounded-lg border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Salir del juego
            </button>
          </div>
        </div>
      )}

      {(phase === "idle" || phase === "playing" || phase === "level-complete") && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {(phase === "playing" || phase === "level-complete") && (
            <SaveAndExitButton onSave={flushProgress} />
          )}

          <SoundToggle />
        </div>
      )}
    </div>
  );
}
