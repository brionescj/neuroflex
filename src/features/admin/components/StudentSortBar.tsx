import { ArrowDown, ArrowUp } from "lucide-react";

import { SORT_LABELS, type SortKey, type SortState } from "../utils/studentTable";

type StudentSortBarProps = {
  sort: SortState;
  onChange: (sort: SortState) => void;
};

const KEYS = Object.keys(SORT_LABELS) as SortKey[];

/** Ordenar la lista en el celular, donde no hay encabezados de columna que tocar. */
export function StudentSortBar({ sort, onChange }: StudentSortBarProps) {
  const Arrow = sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400 lg:hidden">
      <label htmlFor="student-sort" className="shrink-0">
        Ordenar por
      </label>

      <select
        id="student-sort"
        value={sort.key}
        onChange={(event) => onChange({ key: event.target.value as SortKey, direction: "asc" })}
        className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-white outline-none focus:border-white"
      >
        {KEYS.map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onChange({ ...sort, direction: sort.direction === "asc" ? "desc" : "asc" })}
        aria-label={sort.direction === "asc" ? "De menor a mayor: tocar para invertir" : "De mayor a menor: tocar para invertir"}
        title={sort.direction === "asc" ? "De menor a mayor" : "De mayor a menor"}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <Arrow aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
