import { GameCard } from "@/features/games/components/GameCard";
import { GAME_CATALOG } from "@/features/games/gameCatalog";

export default function StudentDashboard() {
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
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}
