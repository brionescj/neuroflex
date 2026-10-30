import { cn } from "@/lib/utils";

export type AdminTab = "students" | "incomplete" | "admins";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "students", label: "Estudiantes" },
  { id: "incomplete", label: "Datos incompletos" },
  { id: "admins", label: "Administradores" },
];

type AdminTabsProps = {
  tab: AdminTab;
  onChange: (tab: AdminTab) => void;
};

export function AdminTabs({ tab, onChange }: AdminTabsProps) {
  const index = TABS.findIndex((item) => item.id === tab);

  return (
    <div className="relative flex w-full overflow-hidden">
      <div className="absolute inset-0 bg-zinc-700" />

      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1/3 bg-white shadow-lg transition-transform duration-200",
          index === 0 && "rounded-r-2xl",
          index === 1 && "translate-x-full rounded-2xl",
          index === 2 && "translate-x-[200%] rounded-l-2xl",
        )}
      />

      {TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "relative z-10 flex-1 px-1 py-3 text-xs font-semibold transition-colors sm:text-sm",
            tab === item.id ? "text-black" : "text-zinc-200 hover:text-white",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
