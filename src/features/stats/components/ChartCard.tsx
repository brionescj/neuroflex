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
import { useId, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import {
  canHideCategories,
  categoriesSignature,
  hiddenCategoriesNote,
  toggleCategory,
  withoutCategories,
} from "../utils/categories";
import { chartToCsv, csvFileName } from "../utils/csv";
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

function download(result: ChartResult, single: boolean) {
  const blob = new Blob([chartToCsv(result, { single })], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = csvFileName(result);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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

  return (
    <SingleStudentContext.Provider value={single}>
    <article className="viz-root rounded-2xl border border-white/10 bg-[var(--viz-surface)] p-4 text-[var(--viz-text)]">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h2 className="text-base font-semibold text-[var(--viz-text)]">{result.title}</h2>

              {description && (
                <HelpButton
                  label={`Qué muestra «${result.title}»`}
                  open={helpOpen}
                  controls={helpId}
                  onClick={() => setHelpOpen((open) => !open)}
                  tone="viz"
                  className="-my-2"
                />
              )}
            </div>
            {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-[var(--viz-text-2)]">{subtitle}</p>}
            {full.basis && <p className="mt-0.5 text-xs leading-relaxed text-[var(--viz-muted)]">{full.basis}</p>}
          </div>

          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => download(result, single)}
              aria-label="Descargar CSV"
              title="Descargar CSV"
              className="flex size-11 items-center justify-center rounded-lg border border-white/10 text-[var(--viz-text-2)] hover:bg-white/5"
            >
              <Download aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>

        {description && helpOpen && (
          <HelpNote id={helpId} label={`Qué muestra «${result.title}»`} onClose={() => setHelpOpen(false)} tone="viz">
            {description}
          </HelpNote>
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
        <GroupLegend
          result={full}
          view={view}
          hidden={hidden}
          onToggle={(key) => setHidden(toggleGroup(hidden, groups, key))}
          onShowAll={() => setHidden(new Set())}
        />

        {canHideCategories(full) && (
          <CategoryFilter
            result={full}
            colored={view === "pie" || view === "stacked"}
            hidden={hiddenCategories}
            onToggle={(index) => setHiddenCategories(toggleCategory(hiddenCategories, full.categories.length, index))}
            onShowAll={() => setHiddenCategories(new Set())}
          />
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
