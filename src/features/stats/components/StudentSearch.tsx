import { useId, useMemo, useState } from "react";

import { normalizeSearch } from "../utils/selection";
import type { Catalog } from "../types";

type StudentSearchProps = {
  students: Catalog["students"];
  /** Se llama al elegir a alguien de la lista. */
  onSelect: (rut: string) => void;
};

const MAX_RESULTS = 8;

/** Busca un estudiante por nombre o RUT y avisa cual se eligio. */
export function StudentSearch({ students, onSelect }: StudentSearchProps) {
  const [query, setQuery] = useState("");
  const inputId = useId();

  const matches = useMemo(() => {
    const needle = normalizeSearch(query);

    if (needle === "") return [];

    return students
      .filter(
        (student) =>
          normalizeSearch(student.name).includes(needle) || student.rut.replace(/\./g, "").includes(needle),
      )
      .slice(0, MAX_RESULTS);
  }, [students, query]);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-xs text-zinc-400">
        Busca por nombre o RUT.
      </label>

      <input
        id={inputId}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ej.: Soto"
        autoComplete="off"
        className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500"
      />

      {matches.length > 0 && (
        <ul aria-label="Estudiantes encontrados" className="overflow-hidden rounded-lg border border-zinc-700">
          {matches.map((student) => (
            <li key={student.rut} className="border-b border-zinc-800 last:border-0">
              <button
                type="button"
                onClick={() => {
                  onSelect(student.rut);
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

      {query.trim() !== "" && matches.length === 0 && <p className="text-xs text-zinc-500">Sin coincidencias.</p>}
    </div>
  );
}
