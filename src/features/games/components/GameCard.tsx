import { Lock } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import type { GameCatalogEntry } from "../gameCatalog";

type GameCardProps = {
  game: GameCatalogEntry;

  /**
   * Mensaje amable que se muestra dentro de la misma tarjeta cuando el juego aun
   * esta bloqueado. Si viene, la tarjeta se ve tenue y no abre el juego: al tocarla
   * explica que falta para jugarlo.
   */
  lockedMessage?: string;
};

const coverClassName =
  "flex h-32 items-center justify-center transition-transform group-hover:scale-[1.02]";

export function GameCard({ game, lockedMessage }: GameCardProps) {
  const Icon = game.icon;
  const [showMessage, setShowMessage] = useState(false);

  if (lockedMessage === undefined) {
    return (
      <Link
        to={game.path}
        className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-left transition-colors hover:border-zinc-600"
      >
        <div className={cn(coverClassName, game.accentClassName)}>
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

  // Bloqueado: se ve, pero tenue; tocarlo despliega el mensaje en la misma tarjeta.
  return (
    <button
      type="button"
      onClick={() => setShowMessage((open) => !open)}
      aria-expanded={showMessage}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 text-left transition-colors hover:border-zinc-600"
    >
      <div className="relative">
        <div className={cn(coverClassName, game.accentClassName, "opacity-40")}>
          <Icon className="size-14 text-white/90" />
        </div>

        <span className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full bg-zinc-950/70 text-white">
          <Lock className="size-4" aria-hidden="true" />
          <span className="sr-only">Bloqueado por ahora</span>
        </span>
      </div>

      <div className="flex w-full flex-col gap-1 bg-zinc-800 p-4">
        <span className="text-base font-semibold text-zinc-300">
          {game.name}
        </span>

        {showMessage ? (
          <span
            role="status"
            className="rounded-xl bg-violet-500/15 px-3 py-2 text-sm text-violet-100"
          >
            {lockedMessage}
          </span>
        ) : (
          <>
            <span className="text-sm text-zinc-500">{game.description}</span>
            <span className="text-xs text-zinc-400">
              Toca para ver cómo desbloquearlo
            </span>
          </>
        )}
      </div>
    </button>
  );
}
