import { cn } from "@/lib/utils";

import type { Catalog, StatGame } from "../types";

type GamePickerProps = {
  catalog: Catalog;
  value: StatGame;
  onChange: (game: StatGame) => void;
};

export function GamePicker({ catalog, value, onChange }: GamePickerProps) {
  return (
    <div role="radiogroup" aria-label="Juego" className="grid grid-cols-2 gap-2">
      {catalog.games.map((game) => (
        <button
          key={game.id}
          type="button"
          role="radio"
          aria-checked={game.id === value}
          onClick={() => onChange(game.id)}
          className={cn(
            "min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
            game.id === value
              ? "border-white bg-white text-black"
              : "border-zinc-700 text-zinc-200 hover:bg-zinc-800",
          )}
        >
          {game.label}
        </button>
      ))}
    </div>
  );
}
