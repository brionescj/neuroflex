import { useEffect } from "react";

import {
  TOTAL_LEVELS,
  useColorSequenceGame,
} from "../hooks/useColorSequenceGame";
import { ColorGrid } from "./ColorGrid";

export function ColorSequenceGame() {
  const {
    phase,
    level,
    sequence,
    activeIndex,
    levelResults,
    start,
    returnToStart,
    registerAnswer,
    continueToNextLevel,
    finish,
  } = useColorSequenceGame();

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const last = levelResults[levelResults.length - 1];
    if (!last) return;

    console.log(
      `[ColorSequenceGame] Nivel ${last.level} (${last.sequenceLength} colores): ` +
        `${last.correctCount} aciertos en ${last.timeMs} ms`,
    );
  }, [levelResults]);

  useEffect(() => {
    if (!import.meta.env.DEV || phase !== "finished") return;

    console.table(
      levelResults.map((r) => ({
        nivel: r.level,
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
  const isLastLevel = level >= TOTAL_LEVELS;
  const showBoard =
    phase === "idle" || phase === "illuminating" || phase === "answering";

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold sm:text-3xl md:text-4xl">
      Serialización de colores
    </h1>
      {showBoard && (
        <>
          <p className="text-sm text-zinc-400">
            {phase === "idle"
              ? "Memoriza el orden en que se iluminan los colores"
              : `Nivel ${level} de ${TOTAL_LEVELS} — recuerda ${sequence.length} colores`}
          </p>

          <div className="relative w-full max-w-56 xs:max-w-64 sm:max-w-xs md:max-w-sm lg:max-w-md">
            <ColorGrid
              activeId={activeId}
              disabled={phase !== "answering"}
              onSelect={registerAnswer}
            />

            {phase === "idle" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={start}
                  className="rounded-full bg-white px-8 py-3 text-lg font-semibold text-black shadow-lg hover:bg-zinc-200"
                >
                  Comenzar
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {phase === "level-result" && lastResult && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-8 text-center">
          <p className="text-sm text-zinc-400">
            Nivel {lastResult.level} de {TOTAL_LEVELS}
          </p>

          <p className="text-lg font-semibold text-white">
            {lastResult.correctCount} de {lastResult.sequenceLength} aciertos
          </p>

          <button
            type="button"
            onClick={isLastLevel ? finish : continueToNextLevel}
            className="mt-1 text-sm font-medium text-sky-400 hover:text-sky-300"
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
                <th className="py-1 font-normal">Aciertos</th>
              </tr>
            </thead>
            <tbody>
              {levelResults.map((r) => (
                <tr
                  key={r.level}
                  className="border-b border-zinc-800/50 last:border-0"
                >
                  <td className="py-1 text-white">{r.level}</td>
                  <td className="py-1">
                    {r.correctCount} de {r.sequenceLength}
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
              disabled
              title="Disponible cuando se habilite el tercer juego"
              className="cursor-not-allowed rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-500"
            >
              Salir del juego
            </button>
          </div>
        </div>
      )}
    </div>
  );
}