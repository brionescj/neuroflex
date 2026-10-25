import { FlaskConical, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { formatNumber } from "../utils/format";
import type { PrintList } from "../utils/cardLists";
import { SHEET_WIDTH_PX } from "../utils/printLayout";
import { PrintModeContext } from "./charts/printMode";
import { SingleStudentContext } from "./charts/singleStudent";

export type PrintSheetProps = {
  title: string;
  /** Que se esta mirando: juego, comparacion, filtros. */
  subtitle: string;
  /** Con cuantos datos se calculo; solo en la vista de un estudiante. */
  basis?: string;
  /** Lo que dice el «?» del grafico; vacio si no lleva. */
  description: string;
  exploratory: boolean;
  warnings: string[];
  /** La leyenda de grupos, ya sin sus instrucciones de tocar. */
  legend?: ReactNode;
  /** El dibujo, en la forma elegida. */
  plot: ReactNode;
  /** Las listas de estudiantes de un resumen, todas, a continuacion del dibujo. */
  lists: PrintList[];
  /** «Qué se deduce»; vacio si el grafico no lleva. */
  deduction?: string;
  /** Titulo de «Cómo se calculó» y sus notas, siempre desplegado en el PDF. */
  calcTitle: string;
  notes: string[];
  single: boolean;
};

const BOX = "rounded-lg border border-[var(--viz-line)] bg-[var(--viz-soft)] px-3 py-2 text-xs leading-relaxed text-[var(--viz-text-2)]";

function cell(value: string | number | null): string {
  if (value === null || value === "") return "—";

  return typeof value === "number" ? formatNumber(value) : value;
}

/** Una lista de estudiantes: un titulo y una sola tabla (si no cabe en la hoja, el PDF la corta entre filas). */
function ListTable({ list }: { list: PrintList }) {
  return (
    <div data-sheet-part="list" data-sheet-kind="list" className="flex flex-col gap-1.5 bg-white py-1">
      <h2 className="text-xs font-medium text-[var(--viz-text)]">{list.title}</h2>

      <table className="w-full border-collapse text-left text-[11px] text-[var(--viz-text-2)]">
        <thead>
          <tr className="border-b border-[var(--viz-line-strong)] text-[var(--viz-muted)]">
            {list.columns.map((column) => (
              <th key={column} scope="col" className="px-2 py-1 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {list.rows.map((row, r) => (
            <tr key={r} className="border-b border-[var(--viz-line)]">
              {row.map((value, c) => (
                <td
                  key={c}
                  className={
                    (c === row.length - 1 && row.length > 4) || (typeof value === "string" && value.length > 24)
                      ? "px-2 py-1"
                      : "whitespace-nowrap px-2 py-1"
                  }
                >
                  {cell(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * La hoja de un grafico tal como va al PDF: fondo blanco, siempre desplegados el «?» y
 * «Cómo se calculó», sin botones. Se dibuja fuera de pantalla a un ancho fijo, no al de la
 * tarjeta, para que el PDF salga igual desde un celular o desde un computador. Cada parte lleva
 * `data-sheet-part` para medirla y pasarla al PDF por separado.
 */
export function PrintSheet({
  title,
  subtitle,
  basis,
  description,
  exploratory,
  warnings,
  legend,
  plot,
  lists,
  deduction,
  calcTitle,
  notes,
  single,
}: PrintSheetProps) {
  return (
    <PrintModeContext.Provider value>
      <SingleStudentContext.Provider value={single}>
        <div
          className="viz-root viz-print bg-white p-0 text-[var(--viz-text)]"
          style={{ width: SHEET_WIDTH_PX }}
          aria-hidden="true"
        >
          <header data-sheet-part="header" data-sheet-kind="text" className="flex flex-col gap-2 bg-white pb-1">
            <h1 className="text-xl font-semibold leading-tight text-[var(--viz-text)]">{title}</h1>
            {subtitle && <p className="text-xs leading-relaxed text-[var(--viz-text-2)]">{subtitle}</p>}
            {basis && <p className="text-xs leading-relaxed text-[var(--viz-muted)]">{basis}</p>}

            {description && (
              <section className={BOX}>
                <h2 className="font-medium text-[var(--viz-text)]">Qué muestra este gráfico</h2>
                <p className="mt-0.5">{description}</p>
              </section>
            )}

            {exploratory && (
              <p className="flex items-start gap-2 rounded-lg border border-[var(--viz-line)] px-3 py-2 text-xs text-[var(--viz-text-2)]">
                <FlaskConical className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  <strong className="font-medium text-[var(--viz-text)]">Indicador exploratorio.</strong> Describe cómo
                  juegan, pero no basta para evaluar a nadie ni para sacar conclusiones por sí solo.
                </span>
              </p>
            )}

            {warnings.map((warning) => (
              <p
                key={warning}
                className="flex items-start gap-2 rounded-lg border border-amber-700/40 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              >
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
                {warning}
              </p>
            ))}
          </header>

          <div data-sheet-part="plot" data-sheet-kind="plot" className="flex flex-col gap-3 bg-white py-2">
            {legend}
            {plot}
          </div>

          {lists.map((list) => (
            <ListTable key={list.title} list={list} />
          ))}

          <div data-sheet-part="notes" data-sheet-kind="text" className="flex flex-col gap-3 bg-white pt-1">
            {deduction && (
              <section className={BOX}>
                <h2 className="font-medium text-[var(--viz-text)]">Qué se deduce</h2>
                <p className="mt-0.5">{deduction}</p>
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
    </PrintModeContext.Provider>
  );
}
