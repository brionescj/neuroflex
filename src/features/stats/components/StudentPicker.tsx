import { X } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { seriesColor } from "../utils/colors";
import { normalizeSearch } from "../utils/selection";
import type { Catalog } from "../types";

type StudentPickerProps = {
  catalog: Catalog;
  value: string[];
  onChange: (ruts: string[]) => void;
};

const MAX_RESULTS = 6;

/** Elige hasta N estudiantes para compararlos; cada uno conserva su color. */
export function StudentPicker({ catalog, value, onChange }: StudentPickerProps) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const max = catalog.maxComparedStudents;
  const plainName = (rut: string) => catalog.students.find((s) => s.rut === rut)?.name ?? rut;
  // Dos elegidos con el mismo nombre se distinguen por su RUT.
  const nameOf = (rut: string) =>
    value.filter((other) => plainName(other) === plainName(rut)).length > 1
      ? `${plainName(rut)} (${rut})`
      : plainName(rut);

  const matches = useMemo(() => {
    const needle = normalizeSearch(query);

    if (needle === "") return [];

    return catalog.students
      .filter(
        (student) =>
          !value.includes(student.rut) &&
          (normalizeSearch(student.name).includes(needle) ||
            student.rut.replace(/\./g, "").includes(needle)),
      )
      .slice(0, MAX_RESULTS);
  }, [catalog.students, query, value]);

  const full = value.length >= max;

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Estudiantes elegidos">
          {value.map((rut, position) => (
            <li
              key={rut}
              className="flex items-center gap-1.5 rounded-full border border-zinc-700 py-1 pl-2.5 pr-1 text-xs text-zinc-200"
            >
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ background: seriesColor(position) }}
              />

              <span className="max-w-40 truncate">{nameOf(rut)}</span>

              <button
                type="button"
                onClick={() => onChange(value.filter((r) => r !== rut))}
                aria-label={`Quitar a ${nameOf(rut)}`}
                className="flex size-6 items-center justify-center rounded-full hover:bg-zinc-700"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label htmlFor={inputId} className="text-xs text-zinc-400">
        {full
          ? `Llegaste al máximo de ${max} estudiantes.`
          : `Busca por nombre o RUT (hasta ${max}).`}
      </label>

      <input
        id={inputId}
        type="text"
        value={query}
        disabled={full}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ej.: Soto"
        autoComplete="off"
        className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500 disabled:opacity-50"
      />

      {matches.length > 0 && (
        <ul className="overflow-hidden rounded-lg border border-zinc-700">
          {matches.map((student) => (
            <li key={student.rut} className="border-b border-zinc-800 last:border-0">
              <button
                type="button"
                onClick={() => {
                  onChange([...value, student.rut]);
                  setQuery("");
                }}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
              >
                <span className="min-w-0 truncate">{student.name}</span>
                <span className="shrink-0 text-xs text-zinc-500">{student.rut}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.trim() !== "" && matches.length === 0 && !full && (
        <p className="text-xs text-zinc-500">Sin coincidencias.</p>
      )}
    </div>
  );
}
