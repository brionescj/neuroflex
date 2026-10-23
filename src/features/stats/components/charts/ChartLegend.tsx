import { TriangleAlert } from "lucide-react";

import { seriesColor } from "../../utils/colors";
import type { ChartResult } from "../../types";

/** Siempre presente con 2 o mas series; con una sola, el titulo ya dice que se mira. */
export function ChartLegend({ result }: { result: ChartResult }) {
  if (result.series.length < 2) return null;

  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[var(--viz-text-2)]" aria-label="Leyenda">
      {result.series.map((series) => (
        <li key={series.key} className="flex items-center gap-1.5">
          {result.kind === "lines" ? (
            <span
              aria-hidden="true"
              className="inline-block w-4 rounded-full"
              style={{ background: seriesColor(series.slot), height: 3 }}
            />
          ) : (
            <span
              aria-hidden="true"
              className="inline-block size-2.5 rounded-sm"
              style={{ background: seriesColor(series.slot) }}
            />
          )}

          <span>{series.label}</span>

          <span className="text-[var(--viz-muted)]">n = {series.n}</span>

          {series.lowN && series.n > 0 && (
            <span className="flex items-center gap-0.5 text-amber-400">
              <TriangleAlert aria-hidden="true" className="size-3" />
              pocos datos
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
