import {
  ChartBarStacked,
  ChartColumn,
  ChartLine,
  ChartPie,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  LoaderCircle,
  Info,
  LayoutGrid,
  Table2,
  TriangleAlert,
} from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import {
  canHideCategories,
  categoriesSignature,
  hiddenCategoriesNote,
  toggleCategory,
  withoutCategories,
} from "../utils/categories";
import { downloadExcel, downloadPdf } from "../utils/exportFiles";
import { groupsOf, groupsSignature, toggleGroup, withoutGroups } from "../utils/groups";
import type { ChartResult, ViewId } from "../types";
import { BarChart } from "./charts/BarChart";
import { CategoryFilter } from "./CategoryFilter";
import { CategoryLegend } from "./charts/CategoryLegend";
import { ChartTable } from "./charts/ChartTable";
import { GroupLegend } from "./charts/GroupLegend";
import { LineChart } from "./charts/LineChart";
import { PieChart } from "./charts/PieChart";
import { StackedChart } from "./charts/StackedChart";
import { SingleStudentContext } from "./charts/singleStudent";
import { StatCards } from "./charts/StatCards";
import { HelpButton, HelpNote } from "./HelpNote";

type ChartCardProps = {
  result: ChartResult;
  /** Que muestra el grafico, en palabras simples; se abre con el icono «?» junto al titulo. */
  description: string;
  /** Que se esta mirando: juego, comparacion, filtros. */
  subtitle: string;
  /** Se esta recalculando: se conserva el dibujo anterior, atenuado. */
  loading: boolean;
  /** La seleccion cambio despues de dibujar este grafico. */
  stale: boolean;
  /** Habla de un solo estudiante: no se escribe «total de estudiantes» ni «(1)». */
  single?: boolean;
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

const NOTHING_HIDDEN: ReadonlySet<string> = new Set();
const NO_CATEGORIES_HIDDEN: ReadonlySet<number> = new Set();

export function ChartCard({ result: full, description, subtitle, loading, stale, single = false }: ChartCardProps) {
  const [chosen, setChosen] = useState<ViewChoice | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [hiddenState, setHiddenState] = useState<{ signature: string; keys: Set<string> }>({
    signature: "",
    keys: new Set(),
  });
  const [hiddenCategoriesState, setHiddenCategoriesState] = useState<{ signature: string; keys: Set<number> }>({
    signature: "",
    keys: new Set(),
  });
  const helpId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  // Las partes ocultas valen mientras sean las mismas partes del mismo grafico.
  const categoriesKey = categoriesSignature(full);
  const hiddenCategories: ReadonlySet<number> =
    hiddenCategoriesState.signature === categoriesKey ? hiddenCategoriesState.keys : NO_CATEGORIES_HIDDEN;

  function setHiddenCategories(keys: Set<number>) {
    setHiddenCategoriesState({ signature: categoriesKey, keys });
  }

  // Los grupos ocultos valen mientras sean los mismos grupos: al cambiar la comparacion se olvidan.
  const groups = useMemo(() => groupsOf(full), [full]);
  const signature = groupsSignature(groups);
  const hidden: ReadonlySet<string> = hiddenState.signature === signature ? hiddenState.keys : NOTHING_HIDDEN;
  const withoutHiddenGroups = useMemo(() => withoutGroups(full, hidden), [full, hidden]);
  const result = useMemo(
    () => withoutCategories(withoutHiddenGroups, hiddenCategories),
    [withoutHiddenGroups, hiddenCategories],
  );
  const categoriesNote = hiddenCategoriesNote(full, hiddenCategories);

  function setHidden(keys: Set<string>) {
    setHiddenState({ signature, keys });
  }

  const choices: ViewChoice[] = [...result.views, "table"];
  // Si la vista elegida no existe en este grafico, se vuelve a la primera.
  const view: ViewChoice = chosen && choices.includes(chosen) ? chosen : (choices[0] as ViewChoice);

  async function exportAs(kind: "pdf" | "excel") {
    if (exporting) return;

    setExporting(kind);

    try {
      if (kind === "excel") await downloadExcel(result, single);
      else if (cardRef.current) await downloadPdf(cardRef.current, result);
    } catch {
      toast.error(kind === "pdf" ? "No se pudo generar el PDF." : "No se pudo generar el Excel.");
    } finally {
      setExporting(null);
    }
  }

  const exportButton = "flex size-11 items-center justify-center rounded-lg border border-white/10 text-[var(--viz-text-2)] hover:bg-white/5 disabled:opacity-50";

  return (
    <SingleStudentContext.Provider value={single}>
    <article ref={cardRef} className="viz-root rounded-2xl border border-white/10 bg-[var(--viz-surface)] p-4 text-[var(--viz-text)]">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h2 className="text-base font-semibold text-[var(--viz-text)]">{result.title}</h2>

              {description && (
                <span data-export-ignore>
                  <HelpButton
                    label={`Qué muestra «${result.title}»`}
                    open={helpOpen}
                    controls={helpId}
                    onClick={() => setHelpOpen((open) => !open)}
                    tone="viz"
                    className="-my-2"
                  />
                </span>
              )}
            </div>
            {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-[var(--viz-text-2)]">{subtitle}</p>}
            {full.basis && <p className="mt-0.5 text-xs leading-relaxed text-[var(--viz-muted)]">{full.basis}</p>}
          </div>

          <div data-export-ignore className="flex shrink-0 gap-1.5">
            {view === "table" && (
              <button
                type="button"
                onClick={() => void exportAs("excel")}
                disabled={exporting !== null}
                aria-label="Descargar tabla en Excel"
                title="Descargar tabla en Excel"
                className={exportButton}
              >
                {exporting === "excel" ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <FileSpreadsheet aria-hidden="true" className="size-4" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => void exportAs("pdf")}
              disabled={exporting !== null}
              aria-label="Descargar gráfico en PDF"
              title="Descargar gráfico en PDF"
              className={exportButton}
            >
              {exporting === "pdf" ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <FileText aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        </div>

        {description && helpOpen && (
          <div data-export-ignore>
          <HelpNote id={helpId} label={`Qué muestra «${result.title}»`} onClose={() => setHelpOpen(false)} tone="viz">
            {description}
          </HelpNote>
          </div>
        )}

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
          <div data-export-ignore role="radiogroup" aria-label="Forma de ver el gráfico" className="flex flex-wrap gap-1.5">
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
          <p data-export-ignore role="status" className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-[var(--viz-text-2)]">
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
        <GroupLegend
          result={full}
          view={view}
          hidden={hidden}
          onToggle={(key) => setHidden(toggleGroup(hidden, groups, key))}
          onShowAll={() => setHidden(new Set())}
        />

        {canHideCategories(full) && (
          <div data-export-ignore>
            <CategoryFilter
            result={full}
            colored={view === "pie" || view === "stacked"}
            hidden={hiddenCategories}
            onToggle={(index) => setHiddenCategories(toggleCategory(hiddenCategories, full.categories.length, index))}
            onShowAll={() => setHiddenCategories(new Set())}
          />
          </div>
        )}

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

      </div>

      {full.deduction && (
        <section
          aria-label={`Qué se deduce de «${result.title}»`}
          className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-[var(--viz-text-2)]"
        >
          <h3 className="font-medium text-[var(--viz-text)]">Qué se deduce</h3>
          <p className="mt-0.5">{full.deduction}</p>
        </section>
      )}

      <details className="mt-4 text-xs text-[var(--viz-text-2)]">
        <summary className="cursor-pointer select-none py-1 text-[var(--viz-muted)] hover:text-[var(--viz-text-2)]">
          Cómo se calculó
          {single
            ? hidden.size > 0 || hiddenCategories.size > 0
              ? " (contando lo que se quitó del gráfico)"
              : ""
            : ` (${full.studentsTotal} ${full.studentsTotal === 1 ? "estudiante" : "estudiantes"}${
                hidden.size > 0 || hiddenCategories.size > 0 ? ", contando lo que se quitó del gráfico" : ""
              })`}
        </summary>

        <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
          {[...full.notes, ...(categoriesNote ? [categoriesNote] : [])].map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </details>
    </article>
    </SingleStudentContext.Provider>
  );
}
