import { cn } from "@/lib/utils";

export type AdminTab = "students" | "teachers";

type AdminTabsProps = {
  tab: AdminTab;
  onChange: (tab: AdminTab) => void;
};

export function AdminTabs({ tab, onChange }: AdminTabsProps) {
  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="absolute inset-0 bg-zinc-700" />

      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1/2 bg-white shadow-lg transition-transform duration-200",
          tab === "students" ? "rounded-r-2xl" : "translate-x-full rounded-l-2xl",
        )}
      />

      <button
        type="button"
        onClick={() => onChange("students")}
        className={cn(
          "relative z-10 flex-1 py-3 text-sm font-semibold transition-colors",
          tab === "students" ? "text-black" : "text-zinc-200 hover:text-white",
        )}
      >
        Estudiantes
      </button>

      <button
        type="button"
        onClick={() => onChange("teachers")}
        className={cn(
          "relative z-10 flex-1 py-3 text-sm font-semibold transition-colors",
          tab === "teachers" ? "text-black" : "text-zinc-200 hover:text-white",
        )}
      >
        Docentes
      </button>
    </div>
  );
}