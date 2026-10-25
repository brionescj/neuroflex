import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useMemo } from "react";

import { cn } from "@/lib/utils";

import { normalizeSearch } from "../utils/selection";
import type { Catalog } from "../types";

type Row = Catalog["studentTable"][number];

type StudentTableProps = {
  students: Row[];
  /** El estudiante que se esta viendo, para marcarlo en la lista. */
  selected: string;
  /** Se llama al tocar una fila. */
  onSelect: (rut: string) => void;
  /** Lo escrito en el buscador y la página, que guarda quien usa la tabla para recordarlos al volver. */
  query: string;
  page: number;
  onQueryChange: (query: string) => void;
  onPageChange: (page: number) => void;
  /**
   * Se llama cuando el puntero se detiene sobre una fila (o se toca / enfoca): permite empezar a
   * calcular su desempeño antes de que se elija, para que aparezca al instante.
   */
  onHint?: (rut: string) => void;
};

const PAGE_SIZE = 10;

function State({ enabled }: { enabled: boolean }) {
  return (
    <span className={cn("text-xs font-medium", enabled ? "text-emerald-400" : "text-rose-400")}>
      {enabled ? "Habilitado" : "Deshabilitado"}
    </span>
  );
}

/**
 * Todos los estudiantes en una tabla para elegir directamente sobre ella, con un buscador
 * que la filtra. Se ve de 10 en 10. En el celular el paralelo y la universidad pasan a la
 * segunda línea del nombre para que no haga falta desplazar hacia el lado.
 */
export function StudentTable({ students, selected, onSelect, query, page, onQueryChange, onPageChange, onHint }: StudentTableProps) {
  const inputId = useId();

  const found = useMemo(() => {
    const needle = normalizeSearch(query);

    if (needle === "") return students;

    return students.filter(
      (student) =>
        normalizeSearch(student.name).includes(needle) || student.rut.replace(/\./g, "").includes(needle.replace(/\./g, "")),
    );
  }, [students, query]);

  const pages = Math.max(1, Math.ceil(found.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const from = current * PAGE_SIZE;
  const visible = found.slice(from, from + PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-xs text-zinc-400">
          Filtra la lista por nombre o RUT.
        </label>

        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            onPageChange(0);
          }}
          placeholder="Ej.: Soto"
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-zinc-500"
        />
      </div>

      {found.length === 0 ? (
        <p className="rounded-lg border border-zinc-800 px-3 py-6 text-center text-xs text-zinc-500">Sin coincidencias.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full border-collapse text-left text-sm text-zinc-300">
            <caption className="sr-only">Estudiantes: toca una fila para ver su desempeño</caption>

            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th scope="col" className="px-3 py-2 font-medium">
                  Estudiante
                </th>
                <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
                  RUT
                </th>
                <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
                  Paralelo
                </th>
                <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
                  Universidad
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Estado
                </th>
              </tr>
            </thead>

            <tbody>
              {visible.map((student) => (
                <tr
                  key={student.rut}
                  onClick={() => onSelect(student.rut)}
                  onPointerEnter={() => onHint?.(student.rut)}
                  onPointerDown={() => onHint?.(student.rut)}
                  onFocus={() => onHint?.(student.rut)}
                  className={cn(
                    "cursor-pointer border-b border-zinc-800 last:border-0 hover:bg-zinc-800/60",
                    student.rut === selected && "bg-zinc-800",
                  )}
                >
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      aria-label={`Ver el desempeño de ${student.name}`}
                      aria-current={student.rut === selected ? "true" : undefined}
                      className="flex min-h-11 w-full flex-col justify-center text-left"
                    >
                      <span className="text-white">{student.name}</span>
                      <span className="text-xs text-zinc-500 sm:hidden">
                        {[student.rut, student.paralelo === null ? null : `Paralelo ${student.paralelo}`, student.university || null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  </td>
                  <td className="hidden px-3 py-1.5 tabular-nums sm:table-cell">{student.rut}</td>
                  <td className="hidden px-3 py-1.5 tabular-nums sm:table-cell">{student.paralelo ?? "—"}</td>
                  <td className="hidden px-3 py-1.5 sm:table-cell">{student.university || "—"}</td>
                  <td className="px-3 py-1.5">
                    <State enabled={student.enabled} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {found.length > PAGE_SIZE && (
        <nav aria-label="Páginas de la lista" className="flex items-center justify-between gap-2 text-xs text-zinc-400">
          <span>
            {from + 1}–{from + visible.length} de {found.length}
          </span>

          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(current - 1)}
              disabled={current === 0}
              className="flex min-h-11 items-center gap-1 rounded-lg border border-zinc-700 px-3 text-zinc-200 enabled:hover:bg-zinc-800 disabled:opacity-40"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              Anterior
            </button>
            <button
              type="button"
              onClick={() => onPageChange(current + 1)}
              disabled={current >= pages - 1}
              className="flex min-h-11 items-center gap-1 rounded-lg border border-zinc-700 px-3 text-zinc-200 enabled:hover:bg-zinc-800 disabled:opacity-40"
            >
              Siguiente
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </span>
        </nav>
      )}
    </div>
  );
}
