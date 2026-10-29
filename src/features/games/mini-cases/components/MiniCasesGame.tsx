import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { audibleContext, unlockSound } from "@/lib/gameSound";
import { BackToGameHub } from "../../components/BackToGameHub";
import { GameLeaseLostNotice } from "../../components/GameLeaseLostNotice";
import { SaveAndExitButton } from "../../components/SaveAndExitButton";
import { SoundToggle } from "../../components/SoundToggle";
import { useGameLease } from "../../hooks/useGameLease";
import { GAME_GUARD_CLASS, useScreenshotDeterrents } from "../../hooks/useScreenshotDeterrents";
import { useLockNavigation } from "../../hooks/useLockNavigation";
import { useWarnBeforeUnload } from "../../hooks/useWarnBeforeUnload";
import { pickDistractorSound, playDistractorSound } from "../audio/distractorSounds";
import {
  DISTRACTOR_MS,
  READING_MS,
  useMiniCasesGame,
} from "../hooks/useMiniCasesGame";
import { MiniCaseImage } from "../images/MiniCaseImage";
import { withoutAlertPrefix } from "../alertText";
import { ReadingProgressBar } from "./ReadingProgressBar";

/** Lo que se anota cuando el sonido no se oyo (silenciado o bloqueado por el navegador). */
const SILENCED = "silenciado";

export function MiniCasesGame() {
  const navigate = useNavigate();

  const {
    casesStatus,
    loadError,
    progressStatus,
    progressError,
    retryLoad,
    canStart,
    hasResumable,
    isGameInProgress,
    resumeExercise,
    totalCases,
    phase,
    caseIndex,
    currentCase,
    selectedOptionIds,
    results,
    submitError,
    start,
    resume,
    returnToStart,
    proceedToOrdering,
    registerDistractor,
    toggleOption,
    canSubmit,
    submitOrder,
    retrySubmit,
    nextCase,
    flushProgress,
  } = useMiniCasesGame();

  // Un juego se juega desde un solo lugar a la vez; y sin las vias faciles de copiar la pantalla.
  const { lost } = useGameLease("mini-cases");

  useScreenshotDeterrents();

  // Mientras hay partida en curso (o una pendiente de continuar) el
  // Sidebar y "Cerrar sesion" quedan inhabilitados.
  useLockNavigation(isGameInProgress);

  // Advertencia (no bloqueo real, un navegador no lo permite) al intentar
  // cerrar la pestana o recargar mientras hay una partida en curso.
  useWarnBeforeUnload(phase !== "idle" && phase !== "finished");

  // Distractor: la imagen es la del caso (la elige el administrador) y el sonido es uno de tres,
  // al azar. Los dos duran lo mismo (DISTRACTOR_MS) y se registran para el analisis. Si el sonido esta
  // silenciado o el navegador no lo deja sonar, se anota «silenciado»: el estudiante no lo oyo.
  const imageKey = currentCase?.imageKey ?? null;

  useEffect(() => {
    if (phase !== "distractors" || !imageKey) return;

    const ctx = audibleContext();
    const sound = pickDistractorSound();

    registerDistractor(imageKey, ctx ? sound : SILENCED);

    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    try {
      playDistractorSound(ctx, master, sound, DISTRACTOR_MS / 1000);
    } catch {
      // Un navegador que no deja sonar no debe romper el juego: la imagen se ve igual.
    }

    return () => {
      // El sonido programa varias fuentes; desconectar el volumen general corta todo de inmediato
      // (por ejemplo, si se sale del juego a mitad del distractor).
      master.disconnect();
    };
  }, [phase, caseIndex, imageKey, registerDistractor]);

  // El audio se crea o reactiva dentro de un toque real de la persona («Comenzar» o «Continuar»): el
  // resto de las fases cambia solo por temporizador y los navegadores no dejan sonar sin un toque.
  function handleStart() {
    unlockSound();
    start();
  }

  function handleResume() {
    unlockSound();
    resume();
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const last = results[results.length - 1];
    if (!last) return;

    console.log(
      `[MiniCasesGame] ${last.caseKey}: ${last.correctSteps} de 4 pasos correctos ` +
        `en ${last.decisionTimeMs} ms`,
    );
  }, [results]);

  useEffect(() => {
    if (!import.meta.env.DEV || phase !== "finished") return;

    console.table(
      results.map((r) => ({
        caso: r.caseKey,
        pasosCorrectos: r.correctSteps,
        completo: r.isFullyCorrect,
        tiempoMs: r.decisionTimeMs,
      })),
    );
  }, [phase, results]);

  if (!currentCase && phase !== "finished" && phase !== "idle") {
    return null;
  }

  const lastResult = results[results.length - 1];
  const isLastCase = caseIndex >= totalCases - 1;
  const fullyCorrectCount = results.filter((r) => r.isFullyCorrect).length;

  return (
    <div className={`${GAME_GUARD_CLASS} mx-auto flex w-full max-w-2xl flex-col items-center gap-4`}>
      {lost && <GameLeaseLostNotice />}

      {phase === "idle" && !hasResumable && <BackToGameHub />}

      <div className="flex w-full items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl">
          Banco de Mini Casos
        </h1>

        <SoundToggle />
      </div>

      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center">
          <p className="max-w-md text-sm text-zinc-300">
            Lee un caso pedagógico, recuerda lo importante y, cuando el
            contexto cambie, ordena tu plan de acción.
          </p>

          {!hasResumable && (
            <ul className="flex max-w-md list-disc flex-col gap-1.5 pl-5 text-left text-sm text-zinc-400">
              <li>
                Tienes {READING_MS / 1000} segundos para leer el caso. Luego
                desaparece.
              </li>
              <li>
                Verás una imagen y escucharás un sonido suave durante 4 segundos para
                despejar la mente, y después un aviso de cambio con información
                nueva. Con el botón de arriba puedes silenciar el sonido.
              </li>
              <li>
                Ordena las 4 acciones: toca primero la que harías
                en primer lugar, luego la segunda, y así. Si tocas una de nuevo,
                la quitas del orden.
              </li>
              <li>
                Para ordenar no hay tiempo límite. Puedes cambiar el orden hasta
                que toques «Enviar respuesta».
              </li>
              <li>
                Al enviar verás cuántos pasos quedaron en su lugar y una
                explicación. Cada caso se responde una vez.
              </li>
            </ul>
          )}

          {(casesStatus === "error" || progressStatus === "error") && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-rose-400">
                {casesStatus === "error"
                  ? (loadError ?? "No se pudo cargar el banco de casos.")
                  : (progressError ??
                    "No se pudo verificar tu avance guardado.")}
              </p>
              <Button variant="outline" onClick={retryLoad}>
                Reintentar
              </Button>
            </div>
          )}

          {casesStatus !== "error" &&
            progressStatus !== "error" &&
            !hasResumable &&
            !canStart && (
              <p className="text-sm text-zinc-500">Cargando...</p>
            )}

          {hasResumable && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-zinc-300">
                Tienes una partida en curso: vas en el caso {resumeExercise} de{" "}
                {totalCases}.
              </p>
              <Button onClick={handleResume}>Continuar</Button>
            </div>
          )}

          {canStart && <Button onClick={handleStart}>Comenzar</Button>}
        </div>
      )}

      {phase === "reading" && currentCase && (
        <div className="flex w-full flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">
            Caso {caseIndex + 1} de {totalCases}
          </p>

          <h2 className="text-lg font-semibold text-sky-300">
            {currentCase.title}
          </h2>

          <ReadingProgressBar key={caseIndex} durationMs={READING_MS} />

          <p className="text-base leading-relaxed text-white">
            {currentCase.baseText}
          </p>
        </div>
      )}

      {phase === "fading" && (
        <div className="h-40 w-full rounded-2xl border border-zinc-800 bg-zinc-900" />
      )}

      {phase === "distractors" && (
        <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <MiniCaseImage
            imageKey={currentCase?.imageKey}
            className="aspect-[8/5] w-full rounded-xl border border-zinc-700"
          />
        </div>
      )}

      {phase === "twist" && currentCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-rose-500/40 bg-zinc-900 p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-rose-400">
              ¡Alerta de cambio!
            </p>

            <p className="text-base leading-relaxed text-white">
              {withoutAlertPrefix(currentCase.twistText)}
            </p>

            <Button onClick={proceedToOrdering} className="self-center">
              Entendido, estructurar plan
            </Button>

            <SaveAndExitButton onSave={flushProgress} className="self-center" unit="caso" />
          </div>
        </div>
      )}

      {(phase === "ordering" ||
        phase === "submitting" ||
        phase === "submit-error") &&
        currentCase && (
          <div className="flex w-full flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm font-semibold text-sky-300">
              {currentCase.title}
            </p>

            <p className="text-sm text-zinc-400">{currentCase.promptText}</p>

            <div className="flex flex-col gap-2">
              {currentCase.options.map((option) => {
                const stepNumber =
                  selectedOptionIds.indexOf(option.optionKey) + 1;
                const isSelected = stepNumber > 0;
                const isFull =
                  !isSelected &&
                  selectedOptionIds.length >= currentCase.options.length;
                const isBusy = phase === "submitting";

                return (
                  <button
                    key={option.optionKey}
                    type="button"
                    disabled={isFull || isBusy}
                    onClick={() => toggleOption(option.optionKey)}
                    aria-pressed={isSelected}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${
                      isSelected
                        ? "border-sky-500/50 bg-sky-500/10 text-zinc-300"
                        : isFull || isBusy
                          ? "cursor-not-allowed border-zinc-800 bg-zinc-950 text-zinc-600"
                          : "border-zinc-700 bg-zinc-950 text-white hover:border-zinc-500"
                    }`}
                  >
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isSelected
                          ? "bg-sky-500 text-black"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {isSelected ? stepNumber : ""}
                    </span>
                    {option.text}
                  </button>
                );
              })}
            </div>

            {phase === "ordering" && (
              <p className="text-xs text-zinc-500">
                Toca una opción para asignarle el siguiente paso. Tócala de
                nuevo para quitarla del orden.
              </p>
            )}

            {phase === "ordering" && (
              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={submitOrder}
                  disabled={!canSubmit}
                  className="w-full sm:w-auto"
                >
                  Enviar respuesta
                </Button>

                {canSubmit && (
                  <p className="text-xs text-zinc-500">
                    Puedes cambiar el orden antes de enviar.
                  </p>
                )}
              </div>
            )}

            {phase === "submitting" && (
              <p className="text-sm text-zinc-500">Enviando respuesta...</p>
            )}

            {phase === "submit-error" && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-rose-400">
                  {submitError ?? "No se pudo enviar la respuesta."}
                </p>
                <Button variant="outline" onClick={retrySubmit}>
                  Reintentar envío
                </Button>
              </div>
            )}
          </div>
        )}

      {phase === "result" && lastResult && currentCase && (
        <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-8 text-center">
          <p className="text-sm text-zinc-400">
            Caso {caseIndex + 1} de {totalCases} · {currentCase.title}
          </p>

          <p className="text-lg font-semibold text-white">
            {lastResult.correctSteps} de {currentCase.options.length} pasos en
            la posición correcta
          </p>

          <div className="flex max-w-md flex-col gap-1">
            <p className="text-sm font-semibold text-sky-300">
              Retroalimentación
            </p>

            <p className="text-sm text-zinc-400">{currentCase.feedback}</p>
          </div>

          <Button onClick={nextCase} className="mt-1">
            {isLastCase ? "Ver resumen final" : "Siguiente caso"}
          </Button>
        </div>
      )}

      {phase === "finished" && (
        <div className="flex w-full flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-center">
          <p className="text-lg font-semibold text-white">
            Entrenamiento completo
          </p>

          <p className="text-sm text-zinc-400">
            {fullyCorrectCount} de {totalCases} casos resueltos con la
            secuencia completa
          </p>

          <table className="w-full text-left text-sm text-zinc-400">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-1 font-normal">Caso</th>
                <th className="py-1 font-normal">Pasos correctos</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, index) => (
                <tr
                  key={`${r.caseKey}-${index}`}
                  className="border-b border-zinc-800/50 last:border-0"
                >
                  <td className="py-1 text-white">Caso {index + 1}</td>
                  <td className="py-1">{r.correctSteps} de 4</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-2 flex justify-center gap-3">
            <Button onClick={returnToStart}>Volver a jugar</Button>

            <Button variant="outline" onClick={() => navigate(ROUTES.STUDENT_GAMES)}>
              Salir del juego
            </Button>
          </div>
        </div>
      )}

      {phase !== "idle" && phase !== "finished" && phase !== "twist" && (
        <SaveAndExitButton onSave={flushProgress} unit="caso" />
      )}
    </div>
  );
}
