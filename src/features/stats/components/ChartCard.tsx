import { ChartColumn, Download, Info, Table2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { chartToCsv, csvFileName } from "../utils/csv";
import type { ChartResult } from "../types";
import { BarChart } from "./charts/BarChart";
import { ChartLegend } from "./charts/ChartLegend";
import { ChartTable } from "./charts/ChartTable";
import { LineChart } from "./charts/LineChart";

type ChartCardProps = {
  result: ChartResult;
  /** Que se esta mirando: juego, comparacion, filtros. */
  subtitle: string;
  /** Se esta recalculando: se conserva el dibujo anterior, atenuado. */
  loading: boolean;
  /** La seleccion cambio despues de dibujar este grafico. */
  stale: boolean;
};

function download(result: ChartResult) {
  const blob = new Blob([chartToCsv(result)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = csvFileName(result);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ChartCard({ result, subtitle, loading, stale }: ChartCardProps) {
  const [table, setTable] = useState(false);

  return (
    <article className="viz-root rounded-2xl border border-white/10 bg-[var(--viz-surface)] p-4 text-[var(--viz-text)]">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--viz-text)]">{result.title}</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--viz-text-2)]">{subtitle}</p>
          </div>

          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => setTable((value) => !value)}
              aria-pressed={table}
              aria-label={table ? "Ver el gráfico" : "Ver como tabla"}
              title={table ? "Ver el gráfico" : "Ver como tabla"}
              className="flex size-11 items-center justify-center rounded-lg border border-white/10 text-[var(--viz-text-2)] hover:bg-white/5"
            >
              {table ? <ChartColumn aria-hidden="true" className="size-4" /> : <Table2 aria-hidden="true" className="size-4" />}
            </button>

            <button
              type="button"
              onClick={() => download(result)}
              aria-label="Descargar CSV"
              title="Descargar CSV"
              className="flex size-11 items-center justify-center rounded-lg border border-white/10 text-[var(--viz-text-2)] hover:bg-white/5"
            >
              <Download aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>

        {stale && (
          <p role="status" className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-[var(--viz-text-2)]">
            <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            Cambiaste la selección. Presiona «Mostrar» para actualizar este gráfico.
          </p>
        )}

        {result.warnings.map((warning) => (
          <p
            key={warning}
            role="note"
            className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
            {warning}
          </p>
        ))}
      </header>

      <div className={cn("mt-4 flex flex-col gap-3 transition-opacity", loading && "opacity-50")} aria-busy={loading}>
        {table ? (
          <ChartTable result={result} />
        ) : result.kind === "lines" ? (
          <LineChart result={result} />
        ) : (
          <BarChart result={result} />
        )}

        <ChartLegend result={result} />
      </div>

      <details className="mt-4 text-xs text-[var(--viz-text-2)]">
        <summary className="cursor-pointer select-none py-1 text-[var(--viz-muted)] hover:text-[var(--viz-text-2)]">
          Cómo se calculó ({result.studentsTotal} {result.studentsTotal === 1 ? "estudiante" : "estudiantes"})
        </summary>

        <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
          {result.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}
