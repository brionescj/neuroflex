import { seriesColor } from "../../utils/colors";
import { formatNumber, formatValue } from "../../utils/format";
import type { ChartResult } from "../../types";
import { shares } from "./composition";

/** Segmentos de menos de esto no llevan el numero adentro: no cabe. */
const LABEL_MIN_SHARE = 0.1;

/**
 * Una barra al 100 % por grupo: cada color es una parte del total. Sirve para
 * comparar repartos entre grupos, que es lo que cuesta ver en una torta.
 */
export function StackedChart({ result }: { result: ChartResult }) {
  return (
    <div className="flex flex-col gap-4">
      {result.series.map((series) => {
        const parts = shares(series.values);
        const drawable = parts.some((part) => part > 0);

        return (
          <div key={series.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate font-medium text-[var(--viz-text)]">{series.label}</span>
              <span className="shrink-0 text-[var(--viz-muted)]">n = {series.n}</span>
            </div>

            {drawable ? (
              <div
                role="img"
                aria-label={`${series.label}: ${result.categories
                  .map((category, i) => `${category} ${formatValue(series.values[i] ?? 0, result.unit)}`)
                  .join(", ")}`}
                className="flex h-9 w-full gap-0.5 overflow-hidden rounded-md"
              >
                {parts.map((part, i) =>
                  part > 0 ? (
                    <div
                      key={result.categories[i]}
                      title={`${result.categories[i]}: ${formatNumber(part * 100)} % (${series.ns[i] ?? 0})`}
                      className="flex min-w-0 items-center justify-center text-[11px] font-semibold text-white"
                      style={{ width: `${part * 100}%`, background: seriesColor(i) }}
                    >
                      {part >= LABEL_MIN_SHARE && (
                        <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                          {formatNumber(part * 100)} %
                        </span>
                      )}
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="flex h-9 items-center text-xs text-[var(--viz-muted)]">Sin datos en este grupo</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
