import { cn } from "@/lib/utils";

import type { OptionChoice } from "../types";

type OptionChipsProps = {
  options: OptionChoice[];
  isOn: (value: string) => boolean;
  onToggle: (value: string) => void;
  /** Con muchas opciones (ciudades) la lista se acota y se desplaza. */
  scroll?: boolean;
};

/** Opciones como botones que se marcan y desmarcan. */
export function OptionChips({ options, isOn, onToggle, scroll = false }: OptionChipsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", scroll && "max-h-52 overflow-y-auto pr-1")}>
      {options.map((option) => {
        const on = isOn(option.value);

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(option.value)}
            className={cn(
              "min-h-9 rounded-full border px-3 py-1 text-xs transition-colors",
              on
                ? "border-white bg-white font-semibold text-black"
                : "border-zinc-700 text-zinc-300 hover:bg-zinc-800",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Desde cuantas opciones la lista de botones se acota. */
export const MANY_OPTIONS = 12;
