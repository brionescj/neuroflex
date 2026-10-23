import {
  ChartBarStacked,
  ChartColumn,
  ChartLine,
  ChartPie,
  Download,
  FlaskConical,
  Info,
  LayoutGrid,
  Table2,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { chartToCsv, csvFileName } from "../utils/csv";
import type { ChartResult, ViewId } from "../types";
import { BarChart } from "./charts/BarChart";
import { CategoryLegend } from "./charts/CategoryLegend";
import { ChartLegend } from "./charts/ChartLegend";
import { ChartTable } from "./charts/ChartTable";
import { LineChart } from "./charts/LineChart";
import { PieChart } from "./charts/PieChart";
import { StackedChart } from "./charts/StackedChart";
import { StatCards } from "./charts/StatCards";

type ChartCardProps = {
  result: ChartResult;
  /** Que se esta mirando: juego, comparacion, filtros. */
  subtitle: string;
  /** Se esta recalculando: se conserva el dibujo anterior, atenuado. */
  loading: boolean;
  /** La seleccion cambio despues de dibujar este grafico. */
  stale: boolean;
};

type ViewChoice = ViewId | "table";

const VIEW_META: Record<ViewChoice, { label: string; Icon: typeof ChartColumn }> = {
  bars: { label: "Barras", Icon: ChartColumn },
  lines: { label: "Líneas", Icon: ChartLine },
  pie: { label: "Torta", Icon: ChartPie },
  stacked: { label: "Apiladas", Icon: ChartBarStacked },
  cards: { label: "Tarjetas", Icon: LayoutGrid },
  table: { label: "Tabla", Icon: Table2 },
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
  const [chosen, setChosen] = useState<ViewChoice | null>(null);

  const choices: ViewChoice[] = [...result.views, "table"];
  // Si la vista elegida no existe en este grafico, se vuelve a la primera.
  const view: ViewChoice = chosen && choices.includes(chosen) ? chosen : (choices[0] as ViewChoice);

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
              onClick={() => download(result)}
              aria-label="Descargar CSV"
              title="Descargar CSV"
              className="flex size-11 items-center justify-center rounded-lg border border-white/10 text-[var(--viz-text-2)] hover:bg-white/5"
            >
              <Download aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>

        {result.exploratory && (
          <p className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[var(--viz-text-2)]">
            <FlaskConical aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <span>
              <strong className="font-medium text-[var(--viz-text)]">Indicador exploratorio.</strong> Describe cómo
              juegan, pero no basta para evaluar a nadie ni para sacar conclusiones por sí solo.
            </span>
          </p>
        )}

        {choices.length > 1 && (
          <div role="radiogroup" aria-label="Forma de ver el gráfico" className="flex flex-wrap gap-1.5">
            {choices.map((choice) => {
              const { label, Icon } = VIEW_META[choice];

              return (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={view === choice}
                  onClick={() => setChosen(choice)}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors",
                    view === choice
                      ? "border-white bg-white text-black"
                      : "border-white/10 text-[var(--viz-text-2)] hover:bg-white/5",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </button>
              );
            })}
          </div>
        )}

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
        {view === "table" ? (
          <ChartTable result={result} />
        ) : view === "cards" && result.cards ? (
          <StatCards cards={result.cards} />
        ) : view === "lines" ? (
          <LineChart result={result} />
        ) : view === "pie" ? (
          <PieChart result={result} />
        ) : view === "stacked" ? (
          <>
            <StackedChart result={result} />
            <CategoryLegend result={result} />
          </>
        ) : (
          <BarChart result={result} />
        )}

        {(view === "bars" || view === "lines") && <ChartLegend result={result} view={view} />}
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
