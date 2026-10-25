import { useEffect } from "react";

import { GameCard } from "@/features/games/components/GameCard";
import { GAME_CATALOG } from "@/features/games/gameCatalog";
import type { GameCatalogEntry } from "@/features/games/gameCatalog";
import { useGameAccess } from "@/features/games/hooks/useGameAccess";
import { prefetchMiniCases } from "@/features/games/mini-cases/services/miniCases.service";
import { prefetchGameProgress } from "@/features/games/services/gameProgress.service";

export default function StudentDashboard() {
  const { access, status, fresh } = useGameAccess();
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

  // Un juego con desbloqueo siempre se ve en el menu: abierto si el servidor lo confirmo,
  // tenue y con una explicacion amable si todavia no (tambien mientras se comprueba).
  function lockedMessageFor(game: GameCatalogEntry): string | undefined {
    if (game.unlockKey === undefined || access?.[game.unlockKey] === true) {
      return undefined;
    }

    if (status === "error") {
      return "No pudimos revisar tu avance ahora. Vuelve a entrar al menú en un momento y lo vemos de nuevo.";
    }

    if (!fresh) return "Estamos revisando tu avance, un momento…";

    return game.unlockHint;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 text-white">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Elige un juego</h1>

        <p className="text-sm text-zinc-400">
          Selecciona el entrenamiento que quieres realizar hoy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {GAME_CATALOG.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            lockedMessage={lockedMessageFor(game)}
          />
        ))}
      </div>
    </div>
  );
}
