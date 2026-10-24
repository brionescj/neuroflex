import { cn } from "@/lib/utils";

export type ViewTab<T extends string> = {
  id: T;
  label: string;
  /** Cómo se ve la información en esta pestaña, en pocas palabras. */
  hint: string;
};

type ViewTabsProps<T extends string> = {
  tabs: ViewTab<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Pestañas con el mismo estilo que «Estudiantes / Administradores»: una barra con la pestaña elegida
 * en blanco. Cada una dice, con una segunda línea, cómo se ve la información.
 */
export function ViewTabs<T extends string>({ tabs, value, onChange }: ViewTabsProps<T>) {
  const index = Math.max(0, tabs.findIndex((tab) => tab.id === value));

  return (
    <div className="relative flex w-full overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-zinc-700" />

      <div
        aria-hidden="true"
        style={{ width: `${100 / tabs.length}%`, transform: `translateX(${index * 100}%)` }}
        className="absolute inset-y-0 left-0 rounded-2xl bg-white shadow-lg transition-transform duration-200"
      />

      {tabs.map((tab) => {
        const on = tab.id === value;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative z-10 flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-center transition-colors",
              on ? "text-black" : "text-zinc-200 hover:text-white",
            )}
          >
            <span className="text-sm font-semibold leading-tight">{tab.label}</span>
            <span className={cn("text-[11px] leading-tight", on ? "text-zinc-600" : "text-zinc-400")}>{tab.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
