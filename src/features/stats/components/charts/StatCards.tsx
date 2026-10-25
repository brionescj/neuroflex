import { ChevronDown, X } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { seriesColor } from "../../utils/colors";
import type { ChartCards } from "../../types";
import { RowsTable } from "./ChartTable";
import { usePrintMode } from "./printMode";

type CardItem = ChartCards[number]["items"][number];
type CardList = NonNullable<CardItem["lists"]>[number];

/** La lista abierta, justo debajo de la fila de la tarjeta que se toco. */
function OpenList({ item, list, onClose }: { item: CardItem; list: CardList; onClose: () => void }) {
  return (
    <div
      role="region"
      aria-label={list.title}
      className="col-span-full flex flex-col gap-2 rounded-xl border border-[var(--viz-line)] p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-[var(--viz-text)]">
          {list.title} · <span className="tabular-nums">{list.rows.length}</span>
          <span className="font-normal text-[var(--viz-muted)]"> · {item.label}</span>
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar la lista"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--viz-text-2)] hover:bg-white/5"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <RowsTable caption={list.title} columns={list.columns} rows={list.rows} emptyText="No hay estudiantes en esta lista." />
    </div>
  );
}

/**
 * Resumen en tarjetas: un bloque por grupo, con el numero grande y su contexto.
 * Una tarjeta con listas abre, al tocar un boton, los estudiantes que hay detras
 * del numero (quienes si, quienes no).
 */
export function StatCards({ cards }: { cards: ChartCards }) {
  const printing = usePrintMode();
  // Que lista esta abierta: bloque, tarjeta y lista. Una a la vez.
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      {cards.map((block, b) => (
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

          {/* «dense»: la lista abierta ocupa su propia fila justo debajo de la tarjeta tocada, y la vecina rellena el hueco. */}
          <div className={cn("grid grid-flow-dense gap-2", printing ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-3")}>
            {block.items.flatMap((item, i) => {
              const openIndex = (item.lists ?? []).findIndex((_, l) => open === `${b}|${i}|${l}`);
              const openList = openIndex === -1 ? undefined : item.lists?.[openIndex];

              return [
                <div key={item.label} className="flex flex-col gap-1 rounded-xl border border-[var(--viz-line)] bg-[var(--viz-soft)] p-3">
                  <dl className="flex flex-col gap-1">
                    <dt className="text-[11px] leading-snug text-[var(--viz-text-2)]">{item.label}</dt>
                    <dd className="text-xl font-semibold tabular-nums text-[var(--viz-text)]">{item.value}</dd>
                  </dl>
                  {item.hint && <p className="whitespace-pre-line text-[11px] leading-snug text-[var(--viz-muted)]">{item.hint}</p>}

                  {item.lists && item.lists.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1">
                      {item.lists.map((list, l) => {
                        const key = `${b}|${i}|${l}`;
                        const isOpen = open === key;

                        return (
                          <button
                            key={list.title}
                            type="button"
                            aria-expanded={isOpen}
                            disabled={list.rows.length === 0}
                            onClick={() => setOpen(isOpen ? null : key)}
                            className={cn(
                              "flex min-h-9 items-center justify-between gap-1.5 rounded-lg border px-2 py-1 text-left text-[11px] leading-snug transition-colors disabled:cursor-default disabled:opacity-50",
                              isOpen
                                ? "border-[var(--viz-line-strong)] bg-[var(--viz-soft-strong)] text-[var(--viz-text)]"
                                : "border-[var(--viz-line)] text-[var(--viz-text-2)] enabled:hover:bg-white/5",
                            )}
                          >
                            <span className="min-w-0">
                              {list.title} <span className="tabular-nums text-[var(--viz-muted)]">({list.rows.length})</span>
                            </span>
                            <ChevronDown
                              aria-hidden="true"
                              className={cn("size-3.5 shrink-0 self-center transition-transform", isOpen && "rotate-180")}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>,
                openList ? <OpenList key={`${item.label}-lista`} item={item} list={openList} onClose={() => setOpen(null)} /> : null,
              ];
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
