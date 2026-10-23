import { seriesColor } from "../../utils/colors";
import type { ChartResult } from "../../types";

/** Leyenda de los graficos de composicion: el color sigue a la categoria, no al grupo. */
export function CategoryLegend({ result }: { result: ChartResult }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-[var(--viz-text-2)]" aria-label="Leyenda">
      {result.categories.map((category, i) => (
        <li key={category + i} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-2.5 rounded-sm"
            style={{ background: seriesColor(i) }}
          />
          {category}
        </li>
      ))}
    </ul>
  );
}
