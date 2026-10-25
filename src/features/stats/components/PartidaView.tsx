import { ArrowLeft, Check, LoaderCircle, Printer, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { getStudentPartidaAction } from "../actions/stats.action";
import type { GameId, PartidaDetail, PartidaItem, PartidaRow } from "../types";
import { chartDay } from "../utils/chartTable";
import { partidaTable, secondsText, totalTimeText, unitsText } from "../utils/partidaTable";

const GAME_NAMES: Record<GameId, string> = {
  "color-sequence": "Seriación de colores",
  "node-connection": "Conexión de nodos",
  "mini-cases": "Mini casos",
};

type PartidaViewProps = {
  rut: string;
  studentName: string;
  attemptId: string;
  game: GameId;
  onBack: () => void;
};

/** Una pieza de una secuencia: un color con su nombre escrito, o un paso. La que quedó fuera de lugar lleva ✗ y un borde. */
function Pill({ item }: { item: PartidaItem }) {
  const wrong = item.ok === false;

  return (
    <li
      className={cn(
        "inline-flex min-h-7 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] leading-tight",
        item.color ? "border-transparent font-medium text-black" : "border-white/15 text-[var(--viz-text)]",
        wrong && "border-red-400 ring-1 ring-red-400",
      )}
      style={item.color ? { background: item.color } : undefined}
    >
      {wrong && <X aria-hidden="true" className="size-3 shrink-0" />}
      {item.ok === true && !item.color && <Check aria-hidden="true" className="size-3 shrink-0 text-emerald-400" />}
      <span>{item.text}</span>
      {wrong && <span className="sr-only">(fuera de lugar)</span>}
    </li>
  );
}

function RowBlock({ row }: { row: PartidaRow }) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-white/10 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold text-[var(--viz-text)]">
          {row.label}
          {row.tryText && <span className="ml-2 text-xs font-normal text-[var(--viz-muted)]">{row.tryText}</span>}
        </h3>

        <p className="flex items-center gap-3 text-xs text-[var(--viz-text-2)]">
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              row.ok === true && "text-emerald-400",
              row.ok === false && "text-red-300",
            )}
          >
            {row.ok === true && <Check aria-hidden="true" className="size-3.5" />}
            {row.ok === false && <X aria-hidden="true" className="size-3.5" />}
            {row.result}
          </span>
          <span className="tabular-nums">
            <span className="sr-only">Tiempo: </span>
            {secondsText(row.seconds)}
          </span>
        </p>
      </div>

      {row.lines.map((line) => (
        <div key={line.title} className="flex flex-col gap-1">
          <h4 className="text-[11px] font-medium text-[var(--viz-muted)]">{line.title}</h4>
          <ol className="flex flex-wrap gap-1.5">
            {line.items.map((item, i) => (
              <Pill key={i} item={item} />
            ))}
          </ol>
        </div>
      ))}

      {row.facts.length > 0 && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--viz-text-2)]">
          {row.facts.map((fact) => (
            <div key={fact.label} className="flex gap-1">
              <dt className="text-[var(--viz-muted)]">{fact.label}:</dt>
              <dd className="tabular-nums text-[var(--viz-text)]">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {row.notice && <p className="text-xs leading-relaxed text-amber-200">{row.notice}</p>}
    </li>
  );
}

/**
 * Los datos de una partida dentro del mismo recuadro del «partida a partida»: nivel por nivel, lo que
 * pidió el juego frente a lo que hizo el estudiante y cuánto tardó. «Volver» regresa a la lista tal
 * como estaba; la impresora baja solo estos datos en un PDF (no la lista de partidas).
 */
export function PartidaView({ rut, studentName, attemptId, game, onBack }: PartidaViewProps) {
  const [detail, setDetail] = useState<PartidaDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setDetail(null);

    const response = await getStudentPartidaAction(rut, attemptId);

    if (!response.success) {
      setError(response.message);
      return;
    }

    setDetail(response.data);
  }, [rut, attemptId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function print() {
    if (!detail || printing) return;

    setPrinting(true);

    try {
      const { downloadPdf } = await import("../utils/exportPdf");
      const table = partidaTable(detail);
      const title = `Datos de la partida ${detail.attemptNumber} de ${GAME_NAMES[detail.game]}`;

      await downloadPdf({
        fileName: `neuroflex-partida-${rut}-${detail.game}-${detail.attemptNumber}-${chartDay()}`,
        title,
        subtitle: [studentName, rut, `Empezó el ${detail.startedAt}`, detail.outcome].filter((part) => part !== "").join(" · "),
        description: "",
        exploratory: false,
        warnings: [],
        plot: (
          <p className="text-xs text-[var(--viz-text-2)]">
            {unitsText(detail)} · Tiempo activo total: {totalTimeText(detail)}
          </p>
        ),
        lists: detail.rows.length === 0 ? [] : [{ title: "Detalle por " + (detail.game === "mini-cases" ? "caso" : "nivel"), ...table }],
        calcTitle: "Cómo leer estos datos",
        notes: detail.notes,
        single: true,
      });
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack} className="min-h-11">
          <ArrowLeft aria-hidden="true" className="mr-1.5 size-4" />
          Volver
        </Button>

        <button
          type="button"
          onClick={() => void print()}
          disabled={!detail || printing}
          aria-label="Descargar solo estos datos en PDF"
          title="Descargar solo estos datos en PDF"
          className="flex size-11 items-center justify-center rounded-lg border border-white/10 text-[var(--viz-text-2)] hover:bg-white/5 disabled:opacity-50"
        >
          {printing ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Printer aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>

      {error ? (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-red-300">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : !detail ? (
        <p className="flex items-center gap-2 text-sm text-[var(--viz-text-2)]" role="status">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Cargando los datos de la partida…
        </p>
      ) : (
        <>
          <header>
            <h3 className="text-base font-semibold text-[var(--viz-text)]">
              Partida {detail.attemptNumber} · {GAME_NAMES[game]}
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--viz-text-2)]">
              Empezó el {detail.startedAt} · {detail.outcome}
            </p>
            <p className="text-xs leading-relaxed text-[var(--viz-muted)]">
              {unitsText(detail)} · Tiempo activo total: {totalTimeText(detail)}
            </p>
          </header>

          {detail.rows.length === 0 ? (
            <p className="rounded-lg border border-white/10 px-3 py-6 text-center text-xs text-[var(--viz-muted)]">
              Esta partida no guardó ningún resultado.
            </p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Datos por nivel">
              {detail.rows.map((row, i) => (
                <RowBlock key={`${row.label}-${row.tryText}-${i}`} row={row} />
              ))}
            </ul>
          )}

          <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--viz-muted)]">
            {detail.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
