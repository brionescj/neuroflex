import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { MANY_OPTIONS, OptionChips } from "./OptionChips";
import { ageSummary, parseAge, toggleFilterValue } from "../utils/selection";
import type { AgeInput, Catalog, DimensionId, FilterSpec, Filters } from "../types";

type FilterPanelProps = {
  catalog: Catalog;
  value: Filters;
  age: AgeInput;
  onChange: (filters: Filters) => void;
  onAgeChange: (age: AgeInput) => void;
  /** Quita los filtros y la edad de una vez (dos cambios seguidos pisarian al primero). */
  onClear: () => void;
  /** El grafico no distingue dispositivos: no se ofrece ese filtro. */
  hideDevice?: boolean;
  /** La caracteristica que se esta comparando: sus valores se eligen en «Cómo verlo». */
  compareBy?: DimensionId | null;
};

const FIELD =
  "h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-zinc-500 scheme-dark";

const AGE_ROW = "age";

/** Una caracteristica por que filtrar: la fila muestra lo elegido y se despliega para elegir. */
function FilterRow({
  id,
  label,
  summary,
  active,
  open,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  summary: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panel = `stats-filter-${id}`;

  return (
    <div className={cn("rounded-xl border", active ? "border-zinc-500" : "border-zinc-800")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panel}
        className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className="text-xs font-medium text-zinc-200">{label}</span>
        <span className={cn("min-w-0 flex-1 truncate text-right text-xs", active ? "text-white" : "text-zinc-500")}>
          {summary}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")}
        />
      </button>

      <div id={panel} className={cn("px-3 pb-3", open ? "block" : "hidden")}>
        {children}
      </div>
    </div>
  );
}

function chipsSummary(spec: FilterSpec, selected: string[]): string {
  if (selected.length === 0) return "Todos";

  const labels = selected.map((v) => spec.options.find((o) => o.value === v)?.label ?? v);

  return labels.length <= 2 ? labels.join(", ") : `${labels.length} elegidos`;
}

/**
 * Filtros combinables: dentro de una caracteristica "o", entre caracteristicas
 * "y". Cada caracteristica es una fila plegada que muestra lo elegido; se abre
 * una a la vez. Solo se ofrecen las opciones que existen en las fichas.
 */
export function FilterPanel({
  catalog,
  value,
  age,
  onChange,
  onAgeChange,
  onClear,
  hideDevice = false,
  compareBy = null,
}: FilterPanelProps) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const parsedAge = parseAge(age, catalog.ageLimits);

  const specs = catalog.filters.filter(
    (spec) => spec.id !== compareBy && !(hideDevice && spec.id === "device"),
  );

  const active =
    specs.some((spec) => (value[spec.id] ?? []).length > 0) ||
    age.min.trim() !== "" ||
    age.max.trim() !== "";

  const toggleRow = (id: string) => setOpenRow((current) => (current === id ? null : id));

  const ageRow = (
    <FilterRow
      key={AGE_ROW}
      id={AGE_ROW}
      label="Edad exacta"
      summary={ageSummary(age, catalog.ageLimits)?.replace("Edad: ", "") ?? "Sin límite"}
      active={age.min.trim() !== "" || age.max.trim() !== ""}
      open={openRow === AGE_ROW}
      onToggle={() => toggleRow(AGE_ROW)}
    >
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { key: "min", label: "Desde" },
            { key: "max", label: "Hasta" },
          ] as const
        ).map((field) => (
          <label key={field.key} className="flex flex-col gap-1.5 text-xs text-zinc-400">
            {field.label}
            <input
              type="text"
              inputMode="numeric"
              maxLength={3}
              placeholder={String(field.key === "min" ? catalog.ageLimits.min : catalog.ageLimits.max)}
              value={age[field.key]}
              aria-invalid={!parsedAge.ok}
              aria-describedby={parsedAge.ok ? undefined : "stats-age-error"}
              onChange={(e) => onAgeChange({ ...age, [field.key]: e.target.value.replace(/\D/g, "") })}
              className={FIELD}
            />
          </label>
        ))}
      </div>

      {!parsedAge.ok && (
        <p id="stats-age-error" role="alert" className="mt-1.5 text-xs text-red-300">
          {parsedAge.message}
        </p>
      )}
    </FilterRow>
  );

  const rows: ReactNode[] = [];

  for (const spec of specs) {
    // La edad exacta va junto a los tramos de edad.
    if (spec.id === "ageBand") rows.push(ageRow);

    const selected = value[spec.id] ?? [];

    rows.push(
      <FilterRow
        key={spec.id}
        id={spec.id}
        label={spec.label}
        summary={chipsSummary(spec, selected)}
        active={selected.length > 0}
        open={openRow === spec.id}
        onToggle={() => toggleRow(spec.id)}
      >
        <OptionChips
          options={spec.options}
          isOn={(optionValue) => selected.includes(optionValue)}
          onToggle={(optionValue) => onChange(toggleFilterValue(value, spec.id, optionValue))}
          scroll={spec.options.length > MANY_OPTIONS}
        />
      </FilterRow>,
    );
  }

  if (!specs.some((spec) => spec.id === "ageBand")) rows.push(ageRow);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-zinc-400">
        Deja fuera a quienes no cumplan. Si marcas varias opciones de una misma
        característica, entran los que cumplan cualquiera de ellas. Sin marcar
        nada, entran todos.
      </p>

      {rows}

      {active && (
        <button
          type="button"
          onClick={onClear}
          className="self-start text-xs text-zinc-300 underline underline-offset-2 hover:text-white"
        >
          Quitar todos los filtros
        </button>
      )}
    </div>
  );
}
