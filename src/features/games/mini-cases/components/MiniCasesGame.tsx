import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { BackToGameHub } from "../../components/BackToGameHub";
import { useLockNavigation } from "../../hooks/useLockNavigation";
import { useWarnBeforeUnload } from "../../hooks/useWarnBeforeUnload";
import { playDistractorSound } from "../audio/distractorSounds";
import { PIXEL_MOTIFS } from "../data/pixelMotifs.data";
import {
  DISTRACTOR_MS,
  READING_MS,
  useMiniCasesGame,
} from "../hooks/useMiniCasesGame";
import type { PixelMotif } from "../types";
import { PixelMotifDistractor } from "./PixelMotifDistractor";
import { ReadingProgressBar } from "./ReadingProgressBar";

function pickRandomMotif(): PixelMotif {
  const index = Math.floor(Math.random() * PIXEL_MOTIFS.length);
  const motif = PIXEL_MOTIFS[index];

  if (!motif) {
    throw new Error("PIXEL_MOTIFS esta vacio.");
  }

  return motif;
}

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
    retrySubmit,
    nextCase,
  } = useMiniCasesGame();

  // Mientras hay partida en curso (o una pendiente de continuar) el
  // Sidebar y "Cerrar sesion" quedan inhabilitados.
  useLockNavigation(isGameInProgress);

  // Advertencia (no bloqueo real, un navegador no lo permite) al intentar
  // cerrar la pestana o recargar mientras hay una partida en curso.
  useWarnBeforeUnload(phase !== "idle" && phase !== "finished");

  // Se elige un solo motivo por caso y se comparte entre la imagen y el
  // sonido (para que "correspondan" tiene que ser la misma eleccion, no
  // dos aleatorios independientes).
  const [currentMotif, setCurrentMotif] = useState<PixelMotif | null>(null);

  useEffect(() => {
    if (phase !== "distractors") return;
    setCurrentMotif(pickRandomMotif());
  }, [phase, caseIndex]);

  // El analisis necesita saber que distractor vio el estudiante.
  useEffect(() => {
    if (phase === "distractors" && currentMotif) {
      registerDistractor(currentMotif.name, currentMotif.sound);
    }
  }, [phase, currentMotif, registerDistractor]);

  // El AudioContext se crea (o se reactiva) dentro de un click real del
  // usuario ("Comenzar"). Es el unico gesto disponible en todo el flujo:
  // el resto de las transiciones de fase son automaticas por temporizador,
  // y la mayoria de navegadores bloquea sonido que no cuelga de un gesto.
  const audioContextRef = useRef<AudioContext | null>(null);

  function unlockAudio() {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext();
      } catch {
        audioContextRef.current = null;
      }
    }
    audioContextRef.current?.resume().catch(() => {});
  }

  function handleStart() {
    unlockAudio();
    start();
  }

  function handleResume() {
    unlockAudio();
    resume();
  }

  useEffect(() => {
    return () => {
      audioContextRef.current?.close().catch(() => {});
    };
  }, []);

  // Sonido acorde al motivo mostrado (no ruido generico): usa el mismo
  // "currentMotif" que ya eligio la imagen, y arma su sonido segun
  // motif.sound (ver distractorSounds.ts para el mapeo por arquetipo).
  useEffect(() => {
    if (phase !== "distractors" || !currentMotif) return;

    const ctx = audioContextRef.current;
    if (!ctx) return;

    const master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    try {
      playDistractorSound(
        ctx,
        master,
        currentMotif.sound,
        DISTRACTOR_MS / 1000,
      );
    } catch {
      // Bloqueado por politica de autoplay del navegador; se ignora, el
      // distractor visual sigue funcionando igual.
    }

    return () => {
      // playDistractorSound programa varias fuentes internamente; no hay
      // una sola referencia que detener. Desconectar el gain maestro corta
      // la salida de audio inmediatamente aunque algun nodo interno siga
      // "vivo" un instante mas.
      master.disconnect();
    };
  }, [phase, currentMotif]);

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
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4">
      {phase === "idle" && !hasResumable && <BackToGameHub />}

      <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl">
        Banco de Mini Casos
      </h1>

      {phase === "idle" && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center">
          <p className="max-w-md text-sm text-zinc-400">
            Vas a leer un caso pedagógico, va a desaparecer, y vas a tener
            unos segundos de distracción antes de que el contexto cambie.
            Vas a tener que reordenar tu plan de acción con la información
            nueva.
          </p>

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
          <PixelMotifDistractor motif={currentMotif} />
        </div>
      )}

      {phase === "twist" && currentCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-rose-500/40 bg-zinc-900 p-6">
            <p className="text-sm font-bold uppercase tracking-wide text-rose-400">
              ¡Alerta de cambio!
            </p>

            <p className="text-base leading-relaxed text-white">
              {currentCase.twistText}
            </p>

            <Button onClick={proceedToOrdering} className="self-center">
              Entendido, reestructurar plan
            </Button>
          </div>
        </div>
      )}

      {(phase === "ordering" ||
        phase === "submitting" ||
        phase === "submit-error") &&
        currentCase && (
          <div className="flex w-full flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
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
            Caso {caseIndex + 1} de {totalCases}
          </p>

          <p className="text-lg font-semibold text-white">
            {lastResult.correctSteps} de {currentCase.options.length} pasos en
            la posición correcta
          </p>

          <p className="max-w-md text-sm text-zinc-400">
            {currentCase.feedback}
          </p>

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

            <Button variant="outline" onClick={() => navigate(ROUTES.STUDENT)}>
              Salir del juego
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
