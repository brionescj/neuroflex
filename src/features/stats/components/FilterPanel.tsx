import { cn } from "@/lib/utils";

import { parseAge, toggleFilterValue } from "../utils/selection";
import type { AgeInput, Catalog, DimensionId, Filters } from "../types";

type FilterPanelProps = {
  catalog: Catalog;
  value: Filters;
  age: AgeInput;
  onChange: (filters: Filters) => void;
  onAgeChange: (age: AgeInput) => void;
  /** Quita filtros y edad de una vez (dos cambios seguidos pisarian al primero). */
  onClear: () => void;
  /** El grafico no distingue dispositivos: no se ofrece ese filtro. */
  hideDevice?: boolean;
};

const FIELD =
  "h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-zinc-500 scheme-dark";

/**
 * Filtros combinables: dentro de una caracteristica "o", entre caracteristicas
 * "y". Solo se ofrecen las opciones que existen en las fichas de los estudiantes.
 */
export function FilterPanel({ catalog, value, age, onChange, onAgeChange, onClear, hideDevice = false }: FilterPanelProps) {
  const parsedAge = parseAge(age, catalog.ageLimits);
  const active =
    Object.values(value).some((values) => values && values.length > 0) ||
    age.min.trim() !== "" ||
    age.max.trim() !== "";

  function setSingle(dimension: DimensionId, option: string) {
    onChange({ ...value, [dimension]: option === "" ? [] : [option] });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-zinc-400">
        Deja fuera a quienes no cumplan. Si marcas varias opciones de una misma
        característica, entran los que cumplan cualquiera de ellas. Sin marcar
        nada, entran todos.
      </p>

      {catalog.filters.filter((spec) => !(hideDevice && spec.id === "device")).map((spec) => {
        const selected = value[spec.id] ?? [];

        if (spec.control === "select") {
          const id = `stats-filter-${spec.id}`;

          return (
            <div key={spec.id} className="flex flex-col gap-1.5">
              <label htmlFor={id} className="text-xs font-medium text-zinc-300">
                {spec.label}
              </label>
              <select
                id={id}
                value={selected[0] ?? ""}
                onChange={(e) => setSingle(spec.id, e.target.value)}
                className={FIELD}
              >
                <option value="">Todas</option>
                {spec.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        return (
          <fieldset key={spec.id} className="min-w-0">
            <legend className="mb-1.5 text-xs font-medium text-zinc-300">{spec.label}</legend>

            <div className="flex flex-wrap gap-2">
              {spec.options.map((option) => {
                const on = selected.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange(toggleFilterValue(value, spec.id, option.value))}
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
          </fieldset>
        );
      })}

      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-xs font-medium text-zinc-300">Edad (años)</legend>

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
                onChange={(e) =>
                  onAgeChange({ ...age, [field.key]: e.target.value.replace(/\D/g, "") })
                }
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
      </fieldset>

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
