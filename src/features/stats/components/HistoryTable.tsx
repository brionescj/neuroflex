import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { getStudentHistoryAction } from "../actions/stats.action";
import type { DateRangeInput, HistoryPage } from "../types";
import { rangeProblem } from "../utils/selection";
import { RowsTable } from "./charts/ChartTable";
import { DateRangeFields } from "./DateRangeFields";

type Filter = DateRangeInput;

const NO_FILTER: Filter = { from: "", to: "" };

/**
 * «Partida a partida»: de 10 en 10, de la más reciente a la más antigua. Pide al servidor
 * solo la página que se ve, y puede acotarse por la fecha en que empezó cada partida.
 */
export function HistoryTable({ rut }: { rut: string }) {
  const [page, setPage] = useState(1);
  // Lo escrito en los campos de fecha y lo que ya se aplicó.
  const [draft, setDraft] = useState<Filter>(NO_FILTER);
  const [applied, setApplied] = useState<Filter>(NO_FILTER);
  const [filtering, setFiltering] = useState(false);
  const [data, setData] = useState<HistoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const load = useCallback(
    async (target: number, filter: Filter) => {
      const ticket = ++latest.current;

      setLoading(true);
      setError(null);

      const response = await getStudentHistoryAction(rut, { page: target, ...filter });

      if (ticket !== latest.current) return;

      setLoading(false);

      if (!response.success) {
        setError(response.message);
        return;
      }

      setData(response.data);
    },
    [rut],
  );

  useEffect(() => {
    void load(page, applied);
  }, [load, page, applied]);

  const pages = data?.pages ?? 1;
  const hasFilter = applied.from !== "" || applied.to !== "";

  function apply() {
    if (rangeProblem(draft) !== null) return;

    setPage(1);
    setApplied(draft);
  }

  function clear() {
    setDraft(NO_FILTER);
    setPage(1);
    setApplied(NO_FILTER);
  }

  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const lastShown = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--viz-text-2)]" role="status">
          {data
            ? data.total === 0
              ? hasFilter
                ? "Ninguna partida empezó en esas fechas."
                : "Este estudiante aún no ha jugado."
              : `Partidas ${first} a ${lastShown} de ${data.total}${hasFilter ? " en las fechas elegidas" : ""}`
            : "Cargando partidas…"}
        </p>

        <Button
          variant="outline"
          size="sm"
          aria-expanded={filtering}
          onClick={() => setFiltering((open) => !open)}
        >
          {hasFilter ? "Filtro por fecha activo" : "Filtrar por fecha"}
        </Button>
      </div>

      {filtering && (
        <form
          aria-label="Filtrar partidas por fecha"
          className="flex flex-col gap-3 rounded-xl border border-white/10 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <DateRangeFields idPrefix="history" value={draft} onChange={setDraft} />

          <p className="text-xs leading-relaxed text-[var(--viz-muted)]">
            Se muestran las partidas que empezaron entre esos días, ambos incluidos (hora de Chile).
          </p>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={rangeProblem(draft) !== null}>
              Aplicar
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clear} disabled={!hasFilter && draft.from === "" && draft.to === ""}>
              Quitar filtro
            </Button>
          </div>
        </form>
      )}

      {error ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-red-300">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load(page, applied)}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div className={cn("transition-opacity", loading && "opacity-50")} aria-busy={loading}>
          {data ? (
            <RowsTable
              caption="Partidas jugadas"
              columns={data.columns}
              rows={data.rows}
              emptyText={hasFilter ? "Ninguna partida empezó en esas fechas." : "Este estudiante aún no ha jugado."}
            />
          ) : (
            <p className="flex items-center gap-2 text-sm text-[var(--viz-text-2)]" role="status">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Cargando partidas…
            </p>
          )}
        </div>
      )}

      {data && data.total > data.pageSize && (
        <nav aria-label="Páginas del partida a partida" className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            aria-label="Página anterior"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Más recientes
          </Button>

          <span className="text-xs tabular-nums text-[var(--viz-text-2)]">
            Página {page} de {pages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= pages || loading}
            onClick={() => setPage((value) => Math.min(pages, value + 1))}
            aria-label="Página siguiente"
          >
            Más antiguas
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
