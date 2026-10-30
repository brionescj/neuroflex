import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

import { seriesColor } from "../../utils/colors";
import { groupsOf, showOnly, subgroupsOf, toggleGroup, toggleSubgroup } from "../../utils/groups";
import type { ChartResult } from "../../types";

type GroupPanelProps = {
  /** El resultado completo: los bloques ocultos siguen en la lista para poder volver a ponerlos. */
  result: ChartResult;
  hidden: ReadonlySet<string>;
  onChange: (keys: Set<string>) => void;
};

const BUTTON =
  "min-h-11 rounded-lg border border-[var(--viz-line)] px-3 py-1 text-xs text-[var(--viz-text-2)] transition-colors hover:bg-white/5";

/**
 * Panel plegable para elegir que bloques se ven cuando son demasiados para botones sueltos (un bloque por
 * mini caso y por grupo comparado, por ejemplo «Mini Caso 1 - UVM»). Cada bloque es una casilla; ademas, se
 * puede quitar o poner de una vez todos los de un grupo («UVM») o dejar a la vista solo los de uno.
 */
export function GroupPanel({ result, hidden, onChange }: GroupPanelProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const groups = groupsOf(result);
  const subgroups = subgroupsOf(result);
  const visible = groups.filter((group) => !hidden.has(group.key)).length;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-white/10 px-3 text-left text-xs text-[var(--viz-text-2)] hover:bg-white/5"
      >
        <span>
          {result.groupPanel}: elegir cuáles ver{" "}
          <span className={hidden.size > 0 ? "text-rose-400" : "text-emerald-400"}>
            ({visible} de {groups.length} se ven)
          </span>
        </span>
        <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div id={panelId} className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {subgroups.flatMap((subgroup) => {
              const allHidden = subgroup.keys.every((key) => hidden.has(key));

              return [
                <button
                  key={`${subgroup.label}-toggle`}
                  type="button"
                  onClick={() => onChange(toggleSubgroup(hidden, groups, subgroup.keys))}
                  className={cn(BUTTON, "flex items-center gap-1.5")}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block size-2.5 rounded-sm"
                    style={{ background: allHidden ? "var(--viz-muted)" : seriesColor(subgroup.slot) }}
                  />
                  {allHidden ? `Poner todos: ${subgroup.label}` : `Quitar todos: ${subgroup.label}`}
                </button>,
                <button
                  key={`${subgroup.label}-only`}
                  type="button"
                  onClick={() => onChange(showOnly(groups, subgroup.keys))}
                  className={BUTTON}
                >
                  Solo {subgroup.label}
                </button>,
              ];
            })}

            <button
              type="button"
              onClick={() => onChange(new Set())}
              disabled={hidden.size === 0}
              className={cn(BUTTON, "disabled:cursor-default disabled:opacity-50")}
            >
              Mostrar todos
            </button>
          </div>

          <ul
            aria-label={result.groupPanel}
            className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto pr-1 text-xs text-[var(--viz-text-2)] sm:grid-cols-2"
          >
            {groups.map((group) => {
              const isHidden = hidden.has(group.key);
              const locked = !isHidden && visible <= 1;

              return (
                <li key={group.key}>
                  <label
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 hover:bg-white/5",
                      locked && "cursor-not-allowed",
                    )}
                    title={locked ? "Tiene que quedar al menos uno a la vista" : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={!isHidden}
                      disabled={locked}
                      onChange={() => onChange(toggleGroup(hidden, groups, group.key))}
                      className="size-4 shrink-0 accent-emerald-400"
                    />
                    <span
                      aria-hidden="true"
                      className="inline-block size-2.5 shrink-0 rounded-sm"
                      style={{ background: isHidden ? "var(--viz-muted)" : seriesColor(group.slot) }}
                    />
                    <span className={cn("min-w-0 break-words leading-snug", isHidden && "line-through opacity-70")}>
                      {group.label}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
