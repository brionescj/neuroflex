import { seriesColor } from "../../utils/colors";
import { formatNumber, formatValue } from "../../utils/format";
import type { ChartResult } from "../../types";

/** Tabla propia de listas y resumenes (estudiantes sin partidas, indicadores por grupo). */
function OwnTable({ result }: { result: ChartResult }) {
  const table = result.table as NonNullable<ChartResult["table"]>;

  if (table.rows.length === 0) {
    return (
      <p className="rounded-lg border border-white/10 px-3 py-6 text-center text-xs text-[var(--viz-muted)]">
        No hay filas para mostrar con estos filtros.
      </p>
    );
  }

  return (
    <div className="max-h-[28rem] max-w-full overflow-auto rounded-lg border border-white/10">
      <table className="w-full min-w-max border-collapse text-left text-xs text-[var(--viz-text-2)]">
        <caption className="sr-only">{result.title}</caption>

        <thead className="sticky top-0 bg-[var(--viz-surface)]">
          <tr className="border-b border-white/10 text-[var(--viz-muted)]">
            {table.columns.map((column) => (
              <th key={column} scope="col" className="px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className="border-b border-white/5 last:border-0">
              {row.map((value, c) => (
                <td
                  key={c}
                  className={
                    c === 0
                      ? "px-3 py-1.5 font-normal text-[var(--viz-text)]"
                      : "px-3 py-1.5 tabular-nums"
                  }
                >
                  {value === null || value === "" ? "—" : typeof value === "number" ? formatNumber(value) : value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** La version en tabla de cualquier grafico: todos los valores, sin pasar el cursor. */
export function ChartTable({ result }: { result: ChartResult }) {
  if (result.table) return <OwnTable result={result} />;

  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-full overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-max border-collapse text-left text-xs text-[var(--viz-text-2)]">
          <caption className="sr-only">
            {result.title}: valores por {result.xLabel.toLowerCase()}
          </caption>

          <thead>
            <tr className="border-b border-white/10 text-[var(--viz-muted)]">
              <th scope="col" className="sticky left-0 bg-[var(--viz-surface)] px-3 py-2 font-medium">
                {result.xLabel}
              </th>

              {result.series.map((series) => (
                <th key={series.key} scope="col" className="px-3 py-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="inline-block size-2 rounded-sm"
                      style={{ background: seriesColor(series.slot) }}
                    />
                    {series.label}
                  </span>
                  <span className="block font-normal">
                    Total de estudiantes: {formatNumber(series.n)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {result.categories.map((category, i) => (
              <tr key={category + i} className="border-b border-white/5 last:border-0">
                <th
                  scope="row"
                  className="sticky left-0 bg-[var(--viz-surface)] px-3 py-1.5 font-normal text-[var(--viz-text)]"
                >
                  {category}
                </th>

                {result.series.map((series) => {
                  const value = series.values[i] ?? null;

                  return (
                    <td key={series.key} className="px-3 py-1.5 text-right tabular-nums">
                      <span className="text-[var(--viz-text)]">
                        {value === null ? "—" : formatValue(value, result.unit)}
                      </span>
                      <span className="ml-1.5 text-[var(--viz-muted)]">({series.ns[i] ?? 0})</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-snug text-[var(--viz-muted)]">
        Entre paréntesis, el total de {result.unitLabel} detrás de cada valor.
      </p>
    </div>
  );
}
