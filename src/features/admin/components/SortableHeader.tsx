import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

import { SORT_LABELS, type SortKey, type SortState } from "../utils/studentTable";

type SortableHeaderProps = {
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
};

/**
 * Titulo de columna que ordena la tabla al tocarlo, como las carpetas de Windows: la primera vez de menor a
 * mayor, la siguiente al reves. La columna que ordena muestra una flecha.
 */
export function SortableHeader({ sortKey, sort, onSort }: SortableHeaderProps) {
  const active = sort.key === sortKey;
  const label = SORT_LABELS[sortKey];
  const Arrow = sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      className="p-0 font-normal"
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Ordenar por ${label.toLowerCase()}`}
        className={cn(
          "flex min-h-11 w-full items-center gap-1 px-3 text-left transition-colors hover:bg-zinc-900 hover:text-white",
          active ? "text-white" : "text-zinc-500",
        )}
      >
        {label}
        {active && <Arrow aria-hidden="true" className="size-3.5 shrink-0" />}
      </button>
    </th>
  );
}
