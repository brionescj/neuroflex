import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { sounds, unlockSound } from "@/lib/gameSound";
import { BackToGameHub } from "./BackToGameHub";
import { useGameLease } from "../hooks/useGameLease";
import { useLockNavigation } from "../hooks/useLockNavigation";
import { GAME_GUARD_CLASS, useScreenshotDeterrents } from "../hooks/useScreenshotDeterrents";
import { useWarnBeforeUnload } from "../hooks/useWarnBeforeUnload";
import {
  MAX_TRIES_PER_LEVEL,
  useColorSequenceGame,
} from "../hooks/useColorSequenceGame";
import { MIN_LEVELS } from "../hooks/colorSequenceConfig";
import { requiredCorrect } from "../hooks/colorSequenceRules";
import { ColorGrid } from "./ColorGrid";
import { FinishGameControl } from "./FinishGameControl";
import { GameLeaseLostNotice } from "./GameLeaseLostNotice";
import { SaveAndExitButton } from "./SaveAndExitButton";
import { SoundToggle } from "./SoundToggle";

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
    countdown,
    flushProgress,
  } = useColorSequenceGame();

  // Un juego se juega desde un solo lugar a la vez; y sin las vias faciles de copiar la pantalla.
  const { lost } = useGameLease("color-sequence");

  useScreenshotDeterrents();

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
    phase === "idle" ||
    phase === "countdown" ||
    phase === "illuminating" ||
    phase === "answering";

  // Sonidos: cada numero de la cuenta, cada color que se enciende, y el resultado del nivel.
  useEffect(() => {
    if (phase === "countdown") sounds.countdownTick();
  }, [phase, countdown]);

  useEffect(() => {
    if (activeId) sounds.color(activeId);
  }, [activeId]);

  useEffect(() => {
    if (phase !== "level-result" || !lastResult) return;

    if (lastResult.passed) sounds.levelUp();
    else sounds.levelMissed();
    // Solo al mostrarse el resultado de ese intento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, levelResults.length]);

  // El navegador solo deja sonar despues de un toque: Comenzar, Continuar y cada color lo habilitan.
  function handleStart() {
    unlockSound();
    start();
  }

  function handleResume() {
    unlockSound();
    resume();
  }

  function handleContinue() {
    unlockSound();
    continueAfterResult();
  }

  function handleSelect(id: Parameters<typeof registerAnswer>[0]) {
    unlockSound();

    if (phase === "answering") sounds.color(id);

    registerAnswer(id);
  }

  const canSaveAndExit =
    phase === "countdown" || phase === "illuminating" || phase === "answering" || phase === "level-result";

  // Termino por agotar los intentos de un nivel (desde el 11), no por decision propia.
  const ranOutOfTries =
    lastResult !== undefined &&
    !lastResult.passed &&
    lastResult.tryNumber >= MAX_TRIES_PER_LEVEL;

  return (
    <div className={`${GAME_GUARD_CLASS} flex w-full flex-col items-center gap-4`}>
      {lost && <GameLeaseLostNotice />}

      {phase === "idle" && !hasResumable && <BackToGameHub />}

      <h1 className="text-center text-2xl font-bold sm:text-3xl md:text-4xl">
        Seriación de colores
      </h1>
      {showBoard && (
        <>
          <p className="text-center text-sm text-zinc-400">
            {phase === "idle"
              ? hasResumable
                ? `Tienes una partida en curso: vas en el ${levelLabel(resumeLevel ?? 1).toLowerCase()}`
                : "Memoriza el orden en que se iluminan los colores y repítelo"
              : phase === "countdown"
                ? `${levelLabel(level)} · Prepárate...`
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
              onSelect={handleSelect}
            />

            {phase === "countdown" && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                aria-live="assertive"
              >
                <span
                  key={countdown}
                  className="text-8xl font-extrabold text-white drop-shadow-[0_0_18px_rgba(0,0,0,0.9)] [animation:count-pop_0.9s_ease-out]"
                >
                  {countdown}
                </span>
              </div>
            )}

            {phase === "idle" && (
              <div className="absolute inset-0 flex items-center justify-center">
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
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResume}
                      className="min-h-12 rounded-full bg-white px-8 py-3 text-lg font-semibold text-black shadow-lg hover:bg-zinc-200"
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

          {phase === "idle" && !hasResumable && (
            <ul className="flex w-full max-w-md list-disc flex-col gap-1.5 pl-9 pr-4 text-left text-sm text-zinc-400">
              <li>
                Mira cómo se iluminan los colores y luego tócalos en el mismo
                orden. Antes de cada intento hay una cuenta regresiva.
              </li>
              <li>
                Cada nivel agrega un color más a la secuencia. Cuenta cada color
                que aciertes en su lugar.
              </li>
              <li>
                Para pasar un nivel debes acertar un mínimo de colores; esa
                exigencia sube a medida que avanzas.
              </li>
              <li>
                Tienes {MAX_TRIES_PER_LEVEL} intentos por nivel, y cada intento
                trae una secuencia nueva del mismo largo.
              </li>
              <li>
                Si no pasas un nivel en {MAX_TRIES_PER_LEVEL} intentos, la
                partida termina. Del nivel 1 al {MIN_LEVELS} se vuelve a empezar
                desde el 1; desde el {MIN_LEVELS + 1} se guarda hasta dónde
                llegaste y puedes elegir «Terminar juego» cuando quieras.
              </li>
            </ul>
          )}

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
            onClick={handleContinue}
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

      {phase !== "finished" && phase !== "failed" && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {canSaveAndExit && <SaveAndExitButton onSave={flushProgress} />}

          <SoundToggle />
        </div>
      )}
    </div>
  );
}
