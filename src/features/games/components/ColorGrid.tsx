import { cn } from "@/lib/utils";

export type SequenceColorId = "blue" | "green" | "orange" | "red";

export const SEQUENCE_COLORS: Array<{
  id: SequenceColorId;
  label: string;
  className: string;
}> = [
  { id: "blue", label: "Azul", className: "bg-sky-500" },
  { id: "green", label: "Verde", className: "bg-emerald-500" },
  { id: "orange", label: "Naranja", className: "bg-amber-500" },
  { id: "red", label: "Rojo", className: "bg-rose-500" },
];

type ColorGridProps = {
  activeId?: SequenceColorId | null;
  disabled?: boolean;
  onSelect: (id: SequenceColorId) => void;
};

export function ColorGrid({ activeId, disabled, onSelect }: ColorGridProps) {
  return (
    <div
      role="group"
      aria-label="Tablero de secuencia de colores"
      className="grid aspect-square w-full grid-cols-2 grid-rows-2 gap-2 rounded-3xl border border-zinc-800 bg-zinc-950 p-2"
    >
      {SEQUENCE_COLORS.map((color) => {
        const isActive = activeId === color.id;

        const opacityClass = isActive
          ? "opacity-100"
          : disabled
            ? "opacity-40"
            : "opacity-70";

        return (
          <button
            key={color.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(color.id)}
            aria-label={`Color ${color.label}`}
            className={cn(
              "rounded-2xl transition-opacity duration-150",
              color.className,
              opacityClass,
              disabled ? "cursor-not-allowed" : "active:opacity-100",
            )}
          />
        );
      })}
    </div>
  );
}