import { seriesColor } from "../../utils/colors";
import type { ChartCards } from "../../types";

/** Resumen en tarjetas: un bloque por grupo, con el numero grande y su contexto. */
export function StatCards({ cards }: { cards: ChartCards }) {
  return (
    <div className="flex flex-col gap-5">
      {cards.map((block) => (
        <section key={block.group} aria-label={block.group} className="flex flex-col gap-2">
          {cards.length > 1 && (
            <h3 className="flex items-center gap-1.5 text-xs font-medium text-[var(--viz-text)]">
              <span
                aria-hidden="true"
                className="inline-block size-2 rounded-sm"
                style={{ background: seriesColor(block.slot) }}
              />
              {block.group}
            </h3>
          )}

          <dl className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {block.items.map((item) => (
              <div key={item.label} className="flex flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <dt className="text-[11px] leading-snug text-[var(--viz-text-2)]">{item.label}</dt>
                <dd className="text-xl font-semibold tabular-nums text-[var(--viz-text)]">{item.value}</dd>
                {item.hint && <p className="text-[11px] leading-snug text-[var(--viz-muted)]">{item.hint}</p>}
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
