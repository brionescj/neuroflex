import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { BackToGameHub } from "./BackToGameHub";
import { useLockNavigation } from "../hooks/useLockNavigation";
import { useWarnBeforeUnload } from "../hooks/useWarnBeforeUnload";
import {
  MAX_TRIES_PER_LEVEL,
  useColorSequenceGame,
} from "../hooks/useColorSequenceGame";
import { requiredCorrect } from "../hooks/colorSequenceRules";
import { ColorGrid } from "./ColorGrid";
import { FinishGameControl } from "./FinishGameControl";

/** El juego no tiene tope de niveles: se muestra solo el numero ("Nivel 3"). */
function levelLabel(level: number): string {
  return `Nivel ${level}`;
}

export function ColorSequenceGame() {
  const navigate = useNavigate();

  const {
    progressStatus,
    progressError,
    retryProgress,
    canStart,
    hasResumable,
    isGameInProgress,
    canFinish,
    resumeLevel,
    resumeLevelInProgress,
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
  } = useColorSequenceGame();

  // Mientras hay partida en curso (o una pendiente de continuar) el
  // Sidebar y "Cerrar sesion" quedan inhabilitados.
  useLockNavigation(isGameInProgress);

  useWarnBeforeUnload(phase !== "idle" && phase !== "finished");

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const last = levelResults[levelResults.length - 1];
    if (!last) return;

    console.log(
      `[ColorSequenceGame] Nivel ${last.level}, intento ${last.tryNumber} ` +
        `(${last.sequenceLength} colores): ${last.correctCount} aciertos ` +
        `en ${last.timeMs} ms (${last.passed ? "pasado" : "no pasado"})`,
    );
  }, [levelResults]);

  useEffect(() => {
    if (!import.meta.env.DEV || phase !== "finished") return;

    console.table(
      levelResults.map((r) => ({
        nivel: r.level,
        intento: r.tryNumber,
        pasado: r.passed,
        colores: r.sequenceLength,
        aciertos: r.correctCount,
        tiempoMs: r.timeMs,
      })),
    );

    const totalMs = levelResults.reduce((sum, r) => sum + r.timeMs, 0);
    console.log(`[ColorSequenceGame] Tiempo total: ${totalMs} ms`);
  }, [phase, levelResults]);

  const activeId =
    phase === "illuminating" && activeIndex !== null
      ? sequence[activeIndex]
      : null;

  const lastResult = levelResults[levelResults.length - 1];
  const showBoard =
    phase === "idle" || phase === "illuminating" || phase === "answering";

  // Termino por agotar los intentos de un nivel (desde el 11), no por decision propia.
  const ranOutOfTries =
    lastResult !== undefined &&
    !lastResult.passed &&
    lastResult.tryNumber >= MAX_TRIES_PER_LEVEL;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {phase === "idle" && !hasResumable && <BackToGameHub />}

      <h1 className="text-center text-2xl font-bold sm:text-3xl md:text-4xl">
        Serialización de colores
      </h1>
      {showBoard && (
        <>
          <p className="text-center text-sm text-zinc-400">
            {phase === "idle"
              ? hasResumable
                ? `Tienes una partida en curso: vas en el ${levelLabel(resumeLevel ?? 1).toLowerCase()}`
                : "Memoriza el orden en que se iluminan los colores"
              : `${levelLabel(level)} · Intento ${tryNumber} de ${MAX_TRIES_PER_LEVEL} — recuerda ${sequence.length} colores`}
          </p>

          {/* Mismo ancho que el tablero de Conexion de nodos: ocupa el ancho del
              celular (hasta 34 rem) y nunca pasa del 62 % del alto de la pantalla. */}
          <div
            className="relative w-full"
            style={{ maxWidth: "min(34rem, 62vh)" }}
          >
            <ColorGrid
              activeId={activeId}
              disabled={phase !== "answering"}
              onSelect={registerAnswer}
            />

            {phase === "idle" && (
              <div className="absolute inset-0 flex items-center justify-center">
                {canStart && (
                  <button
                    type="button"
                    onClick={start}
                    className="rounded-full bg-white px-8 py-3 text-lg font-semibold text-black shadow-lg hover:bg-zinc-200"
                  >
                    Comenzar
                  </button>
                )}

                {hasResumable && (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={resume}
                      className="rounded-full bg-white px-8 py-3 text-lg font-semibold text-black shadow-lg hover:bg-zinc-200"
                    >
                      Continuar
                    </button>

                    {canFinish && (
                      <FinishGameControl
                        onConfirm={finish}
                        levelInProgress={resumeLevelInProgress}
                      />
                    )}
                  </div>
                )}

                {progressStatus === "error" && (
                  <div className="flex flex-col items-center gap-2 rounded-2xl bg-zinc-950/90 p-4 text-center">
                    <p className="text-sm text-rose-400">
                      {progressError ??
                        "No se pudo verificar tu avance guardado."}
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
                  <p className="rounded-xl bg-zinc-950/90 px-4 py-2 text-sm text-zinc-500">
                    Cargando...
                  </p>
                )}
              </div>
            )}
          </div>

          {canFinish && phase !== "idle" && (
            <FinishGameControl onConfirm={finish} levelInProgress />
          )}
        </>
      )}

      {phase === "level-result" && lastResult && (
        <div className="flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-8 text-center">
          <p className="text-sm text-zinc-400">
            {levelLabel(lastResult.level)} · Intento {lastResult.tryNumber} de{" "}
            {MAX_TRIES_PER_LEVEL}
          </p>

          <p className="text-lg font-semibold text-white">
            {lastResult.correctCount} de {lastResult.sequenceLength} aciertos
          </p>

          {!lastResult.passed && (
            <p className="text-sm text-zinc-400">
              Para pasar este nivel necesitas al menos{" "}
              {requiredCorrect(lastResult.level, lastResult.sequenceLength)}{" "}
              aciertos.{" "}
              {MAX_TRIES_PER_LEVEL - lastResult.tryNumber === 1
                ? "Te queda 1 intento."
                : `Te quedan ${MAX_TRIES_PER_LEVEL - lastResult.tryNumber} intentos.`}{" "}
              La secuencia será distinta.
            </p>
          )}

          <button
            type="button"
            onClick={continueAfterResult}
            className="mt-1 min-h-11 px-4 text-sm font-medium text-sky-400 hover:text-sky-300"
          >
            {lastResult.passed ? "Siguiente nivel" : "Intentar de nuevo"}
          </button>

          {canFinish && (
            <FinishGameControl onConfirm={finish} levelInProgress={false} />
          )}
        </div>
      )}

      {phase === "failed" && lastResult && (
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-6 text-center">
          <p className="text-lg font-semibold text-white">Fin de la partida</p>

          <p className="text-sm text-zinc-300">
            No lograste pasar el {levelLabel(lastResult.level).toLowerCase()}{" "}
            en {MAX_TRIES_PER_LEVEL} intentos (último intento:{" "}
            {lastResult.correctCount} de {lastResult.sequenceLength} aciertos).
          </p>

          <p className="text-sm text-zinc-400">
            Para seguir avanzando hay que empezar de nuevo desde el nivel 1.
            {maxLevelPassed > 0 && ` Nivel máximo superado: ${maxLevelPassed}.`}
          </p>

          <div className="mt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={returnToStart}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200"
            >
              Volver a empezar
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

      {phase === "finished" && (
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-center sm:max-w-md lg:max-w-lg">
          <p className="text-lg font-semibold text-white">
            Entrenamiento completo
          </p>

          {ranOutOfTries && lastResult && (
            <p className="text-sm text-zinc-400">
              No superaste el {levelLabel(lastResult.level).toLowerCase()} en{" "}
              {MAX_TRIES_PER_LEVEL} intentos, por eso el juego termina aquí.
            </p>
          )}

          <p className="text-sm text-zinc-300">
            Nivel máximo superado: {maxLevelPassed}
          </p>

          <table className="w-full text-left text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-1 font-normal">Nivel</th>
                <th className="py-1 font-normal">Intento</th>
                <th className="py-1 font-normal">Aciertos</th>
                <th className="py-1 font-normal">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {levelResults.map((r) => (
                <tr
                  key={`${r.level}-${r.tryNumber}`}
                  className="border-b border-zinc-800/50 last:border-0"
                >
                  <td className="py-1 text-white">{r.level}</td>
                  <td className="py-1">{r.tryNumber}</td>
                  <td className="py-1">
                    {r.correctCount} de {r.sequenceLength}
                  </td>
                  <td className="py-1">{r.passed ? "Superado" : "No superado"}</td>
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
    </div>
  );
}