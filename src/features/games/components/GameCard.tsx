import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import type { GameCatalogEntry } from "../gameCatalog";

type GameCardProps = {
  game: GameCatalogEntry;
};

export function GameCard({ game }: GameCardProps) {
  const Icon = game.icon;

  return (
    <Link
      to={game.path}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-left transition-colors hover:border-zinc-600"
    >
      <div
        className={cn(
          "flex h-32 items-center justify-center transition-transform group-hover:scale-[1.02]",
          game.accentClassName,
        )}
      >
        <Icon className="size-14 text-white/90" />
      </div>

      <div className="flex flex-col gap-1 bg-zinc-800 p-4">
        <span className="text-base font-semibold text-white">
          {game.name}
        </span>

        <span className="text-sm text-zinc-400">{game.description}</span>
      </div>
    </Link>
  );
}
