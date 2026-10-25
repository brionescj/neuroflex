import { FlaskConical, TriangleAlert } from "lucide-react";

import type { ChartResult, ViewId } from "../types";
import { SHEET_PARTS, SHEET_WIDTH_PX } from "../utils/printLayout";
import { ChartPlot } from "./charts/ChartPlot";
import { GroupLegend } from "./charts/GroupLegend";
import { SingleStudentContext } from "./charts/singleStudent";

export type PrintSheetProps = {
  /** El resultado con lo que se quitó del gráfico ya descontado: lo que se ve en pantalla. */
  result: ChartResult;
  /** El resultado completo: la leyenda de grupos sigue mostrando los grupos quitados. */
  full: ChartResult;
  view: ViewId;
  hidden: ReadonlySet<string>;
  subtitle: string;
  /** Lo que dice el «?» del gráfico. */
  description: string;
  /** Titulo de «Cómo se calculó» y sus notas, siempre desplegado en el PDF. */
  calcTitle: string;
  notes: string[];
  single: boolean;
};

const NOOP = () => undefined;

/**
 * La hoja de un grafico tal como va al PDF: fondo blanco, siempre desplegados el «?» y
 * «Cómo se calculó», sin botones. Se dibuja fuera de pantalla a un ancho fijo, no al de la
 * tarjeta, para que el PDF salga igual desde un celular o desde un computador.
 */
export function PrintSheet({ result, full, view, hidden, subtitle, description, calcTitle, notes, single }: PrintSheetProps) {
  return (
    <SingleStudentContext.Provider value={single}>
      <div
        className="viz-root viz-print bg-white p-0 text-[var(--viz-text)]"
        style={{ width: SHEET_WIDTH_PX }}
        aria-hidden="true"
      >
        <header data-sheet-part={SHEET_PARTS.header} className="flex flex-col gap-2 bg-white pb-1">
          <h1 className="text-xl font-semibold leading-tight text-[var(--viz-text)]">{result.title}</h1>
          {subtitle && <p className="text-xs leading-relaxed text-[var(--viz-text-2)]">{subtitle}</p>}
          {full.basis && <p className="text-xs leading-relaxed text-[var(--viz-muted)]">{full.basis}</p>}

          {description && (
            <section className="rounded-lg border border-[var(--viz-line)] bg-[var(--viz-soft)] px-3 py-2 text-xs leading-relaxed text-[var(--viz-text-2)]">
              <h2 className="font-medium text-[var(--viz-text)]">Qué muestra este gráfico</h2>
              <p className="mt-0.5">{description}</p>
            </section>
          )}

          {result.exploratory && (
            <p className="flex items-start gap-2 rounded-lg border border-[var(--viz-line)] px-3 py-2 text-xs text-[var(--viz-text-2)]">
              <FlaskConical className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <strong className="font-medium text-[var(--viz-text)]">Indicador exploratorio.</strong> Describe cómo
                juegan, pero no basta para evaluar a nadie ni para sacar conclusiones por sí solo.
              </span>
            </p>
          )}

          {result.warnings.map((warning) => (
            <p
              key={warning}
              className="flex items-start gap-2 rounded-lg border border-amber-700/40 bg-amber-50 px-3 py-2 text-xs text-amber-900"
            >
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
              {warning}
            </p>
          ))}
        </header>

        <div data-sheet-part={SHEET_PARTS.plot} className="flex flex-col gap-3 bg-white py-2">
          <GroupLegend result={full} view={view} hidden={hidden} onToggle={NOOP} onShowAll={NOOP} readOnly />
          <ChartPlot result={result} view={view} />
        </div>

        <div data-sheet-part={SHEET_PARTS.notes} className="flex flex-col gap-3 bg-white pt-1">
          {full.deduction && (
            <section className="rounded-lg border border-[var(--viz-line)] bg-[var(--viz-soft)] px-3 py-2 text-xs leading-relaxed text-[var(--viz-text-2)]">
              <h2 className="font-medium text-[var(--viz-text)]">Qué se deduce</h2>
              <p className="mt-0.5">{full.deduction}</p>
            </section>
          )}

          <section className="text-xs leading-relaxed text-[var(--viz-text-2)]">
            <h2 className="font-medium text-[var(--viz-text)]">{calcTitle}</h2>
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </SingleStudentContext.Provider>
  );
}
