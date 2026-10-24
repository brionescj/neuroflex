import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { getStudentEvolutionAction } from "../actions/stats.action";
import type { EvolutionBy, EvolutionSpan, StudentEvolution } from "../types";
import { ChartCard } from "./ChartCard";
import { GameSection } from "./GameSection";

type Reading = { by: EvolutionBy; span: EvolutionSpan };

const WEEKLY: { span: EvolutionSpan; label: string }[] = [
  { span: "1", label: "Por semana · último mes" },
  { span: "2", label: "Por semana · últimos 2 meses" },
  { span: "3", label: "Por semana · últimos 3 meses" },
  { span: "6", label: "Por semana · últimos 6 meses" },
  { span: "all", label: "Por semana · todo el tiempo" },
];

const MONTHLY: { span: EvolutionSpan; label: string }[] = [
  { span: "3", label: "Por mes · últimos 3 meses" },
  { span: "6", label: "Por mes · últimos 6 meses" },
  { span: "9", label: "Por mes · últimos 9 meses" },
  { span: "12", label: "Por mes · últimos 12 meses" },
  { span: "all", label: "Por mes · todo el tiempo" },
];

const encode = (reading: Reading) => `${reading.by}:${reading.span}`;

function decode(value: string): Reading {
  const [by, span] = value.split(":") as [EvolutionBy, EvolutionSpan];

  return { by, span };
}

const PANEL = "viz-root rounded-2xl border border-white/10 bg-[var(--viz-surface)] p-4 text-[var(--viz-text)]";

/**
 * Evolución del estudiante: el promedio de sus partidas en cada semana (de lunes a domingo)
 * o en cada mes, juego por juego, para ver cómo ha ido cambiando.
 */
export function EvolutionSection({ rut }: { rut: string }) {
  const selectId = useId();
  const [reading, setReading] = useState<Reading>({ by: "week", span: "1" });
  const [data, setData] = useState<StudentEvolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  const load = useCallback(
    async (target: Reading) => {
      const ticket = ++latest.current;

      setLoading(true);
      setError(null);

      const response = await getStudentEvolutionAction(rut, target.by, target.span);

      if (ticket !== latest.current) return;

      setLoading(false);

      if (!response.success) {
        setError(response.message);
        return;
      }

      setData(response.data);
    },
    [rut],
  );

  useEffect(() => {
    void load(reading);
  }, [load, reading]);

  return (
    <>
      <section aria-label="Lectura en el tiempo" className={PANEL}>
        <label htmlFor={selectId} className="mb-1.5 block text-xs text-[var(--viz-text-2)]">
          Tipo de lectura
        </label>
        <select
          id={selectId}
          value={encode(reading)}
          onChange={(event) => setReading(decode(event.target.value))}
          className="min-h-11 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-zinc-500 sm:w-80"
        >
          <optgroup label="Promedios por semana">
            {WEEKLY.map((option) => (
              <option key={option.span} value={encode({ by: "week", span: option.span })}>
                {option.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Promedios por mes">
            {MONTHLY.map((option) => (
              <option key={option.span} value={encode({ by: "month", span: option.span })}>
                {option.label}
              </option>
            ))}
          </optgroup>
        </select>

        {data && data.notes.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--viz-text-2)]">
            {data.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        {loading && !data && (
          <p className="mt-3 flex items-center gap-2 text-sm text-[var(--viz-text-2)]" role="status">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Calculando los promedios…
          </p>
        )}

        {error && (
          <div className="mt-3 flex flex-col items-start gap-3">
            <p role="alert" className="text-sm text-red-300">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void load(reading)}>
              Reintentar
            </Button>
          </div>
        )}
      </section>

      {data && (
        <div className={cn("flex flex-col gap-4 transition-opacity", loading && "opacity-50")} aria-busy={loading}>
          {data.games.map((game) => (
            <GameSection
              key={game.game}
              title={game.label}
              empty={game.charts.length === 0}
              summary={
                !game.played
                  ? "Aún no ha jugado"
                  : game.charts.length === 0
                    ? "Sin partidas en este período"
                    : `${data.label} · ${game.partidas} ${game.partidas === 1 ? "partida" : "partidas"}`
              }
            >
              {game.charts.map((chart) => (
                <ChartCard
                  key={chart.id}
                  result={chart.result}
                  description={chart.description}
                  subtitle={data.label}
                  loading={false}
                  stale={false}
                  single
                />
              ))}
            </GameSection>
          ))}
        </div>
      )}
    </>
  );
}
