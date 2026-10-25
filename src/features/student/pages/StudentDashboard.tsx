import { useEffect } from "react";

import { GameCard } from "@/features/games/components/GameCard";
import { GAME_CATALOG } from "@/features/games/gameCatalog";
import { useGameAccess } from "@/features/games/hooks/useGameAccess";
import { prefetchMiniCases } from "@/features/games/mini-cases/services/miniCases.service";
import { prefetchGameProgress } from "@/features/games/services/gameProgress.service";

export default function StudentDashboard() {
  const { access } = useGameAccess();
  const miniCasesOpen = access?.miniCases === true;

  // Con el menu a la vista se piden por adelantado el avance de los juegos (y el banco de Mini casos, si ya lo
  // tiene): al tocar uno, abre sin esperar al servidor. Cada vez que se vuelve al menu se piden de nuevo.
  useEffect(() => {
    prefetchGameProgress("color-sequence");
    prefetchGameProgress("node-connection");

    if (miniCasesOpen) {
      prefetchGameProgress("mini-cases");
      prefetchMiniCases();
    }
  }, [miniCasesOpen]);

  // Un juego con desbloqueo no aparece hasta que el servidor lo confirme
  // (tampoco mientras carga ni si la consulta falla): oculto, sin pistas.
  const games = GAME_CATALOG.filter(
    (game) => game.unlockKey === undefined || access?.[game.unlockKey] === true,
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 text-white">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Elige un juego</h1>

        <p className="text-sm text-zinc-400">
          Selecciona el entrenamiento que quieres realizar hoy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}
