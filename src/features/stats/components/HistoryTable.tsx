import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { getStudentHistoryAction } from "../actions/stats.action";
import type { DateRangeInput, HistoryPage } from "../types";
import { pageItems } from "../utils/pageList";
import { rangeProblem } from "../utils/selection";
import { RowsTable } from "./charts/ChartTable";
import { DateRangeFields } from "./DateRangeFields";

type Filter = DateRangeInput;

const PAGE_BUTTON = "flex size-10 items-center justify-center rounded-lg transition-colors";

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
  // Las páginas ya vistas, por filtro y número: volver a una no toca la base. Vale mientras se mira a este estudiante.
  const seen = useRef(new Map<string, HistoryPage>());

  const load = useCallback(
    async (target: number, filter: Filter) => {
      const ticket = ++latest.current;
      const key = `${filter.from}|${filter.to}|${target}`;
      const known = seen.current.get(key);

      setError(null);

      if (known) {
        setData(known);
        setLoading(false);
        return;
      }

      setLoading(true);

      const response = await getStudentHistoryAction(rut, { page: target, ...filter });

      if (ticket !== latest.current) return;

      setLoading(false);

      if (!response.success) {
        setError(response.message);
        return;
      }

      seen.current.set(key, response.data);
      setData(response.data);
    },
    [rut],
  );

  useEffect(() => {
    void load(page, applied);
  }, [load, page, applied]);

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
            Se muestran las partidas que empezaron entre esos días, ambos incluidos.
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

      {data && data.pages > 1 && (
        <nav aria-label="Páginas del partida a partida" className="flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage(page - 1)}
            aria-label="Página anterior"
            className={cn(PAGE_BUTTON, "border border-white/10 text-[var(--viz-text-2)] enabled:hover:bg-white/5 disabled:opacity-40")}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </button>

          {pageItems(page, data.pages).map((item) =>
            typeof item === "number" ? (
              <button
                key={item}
                type="button"
                disabled={loading}
                onClick={() => setPage(item)}
                aria-label={`Página ${item}`}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  PAGE_BUTTON,
                  "text-sm font-medium tabular-nums",
                  item === page ? "bg-white text-black" : "text-[var(--viz-text-2)] enabled:hover:bg-white/5",
                )}
              >
                {item}
              </button>
            ) : (
              <span key={item} aria-hidden="true" className={cn(PAGE_BUTTON, "text-[var(--viz-muted)]")}>
                …
              </span>
            ),
          )}

          <button
            type="button"
            disabled={page >= data.pages || loading}
            onClick={() => setPage(page + 1)}
            aria-label="Página siguiente"
            className={cn(PAGE_BUTTON, "border border-white/10 text-[var(--viz-text-2)] enabled:hover:bg-white/5 disabled:opacity-40")}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
