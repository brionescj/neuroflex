import { Link } from "react-router-dom";

import { ROUTES } from "@/config/routes";

import { AttemptsChart } from "../components/AttemptsChart";
import { BadgesSection } from "../components/BadgesSection";
import { CaseStepsChart } from "../components/CaseStepsChart";
import { HowPointsWork } from "../components/HowPointsWork";
import { LevelLadder } from "../components/LevelLadder";
import { NodeMarginChart } from "../components/NodeMarginChart";
import { PointsByGameChart } from "../components/PointsByGameChart";
import { ScoreHero } from "../components/ScoreHero";
import { StatTiles } from "../components/StatTiles";
import { useStudentScores } from "../hooks/useStudentScores";

export default function StudentScoresPage() {
  const { status, scores, reload } = useStudentScores();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 text-white">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Mis puntuaciones</h1>
        <p className="text-sm text-zinc-400">Tu avance, tus marcas y lo que has logrado.</p>
      </div>

      {status === "loading" && !scores && (
        <p role="status" className="py-10 text-center text-zinc-400">
          Cargando tus puntuaciones…
        </p>
      )}

      {status === "error" && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-sm text-zinc-300">No pudimos cargar tus puntuaciones ahora. Revisa tu conexión e inténtalo de nuevo.</p>
          <button
            type="button"
            onClick={reload}
            className="min-h-11 rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
          >
            Reintentar
          </button>
        </div>
      )}

      {scores && (
        <>
          <ScoreHero scores={scores} />

          {!scores.hasPlayed ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-sm text-zinc-300">
                Cuando juegues tu primer nivel, aquí aparecerán tus puntos, tus insignias y tus gráficos.
              </p>
              <Link
                to={ROUTES.STUDENT}
                className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                Elegir un juego
              </Link>
            </div>
          ) : (
            <>
              <StatTiles stats={scores.stats} />

              <PointsByGameChart pointsByGame={scores.pointsByGame} />

              <LevelLadder
                gameId="color-sequence"
                ladder={scores.colorSequence.ladder}
                bestLevel={scores.colorSequence.bestLevel}
              />

              {scores.colorSequence.attempts.length > 0 && (
                <AttemptsChart gameId="color-sequence" attempts={scores.colorSequence.attempts} />
              )}

              <LevelLadder
                gameId="node-connection"
                ladder={scores.nodes.ladder}
                bestLevel={scores.nodes.bestLevel}
              />

              {scores.nodes.attempts.length > 0 && (
                <AttemptsChart gameId="node-connection" attempts={scores.nodes.attempts} />
              )}

              {scores.nodes.margins.length > 0 && <NodeMarginChart margins={scores.nodes.margins} />}

              {scores.miniCases.cases.length > 0 && <CaseStepsChart cases={scores.miniCases.cases} />}
            </>
          )}

          <BadgesSection badges={scores.badges} />

          <HowPointsWork />
        </>
      )}
    </div>
  );
}
