import { seriesColor } from "../../utils/colors";
import { formatValue } from "../../utils/format";
import type { ChartResult } from "../../types";

/** La version en tabla de cualquier grafico: todos los valores, sin pasar el cursor. */
export function ChartTable({ result }: { result: ChartResult }) {
  return (
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
                <span className="block font-normal">n = {series.n}</span>
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
  );
}
