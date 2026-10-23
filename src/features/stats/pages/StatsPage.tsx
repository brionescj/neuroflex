import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useMediaQuery } from "@/hooks/useMediaQuery";

import { getStatsCatalogAction, getStatsChartAction } from "../actions/stats.action";
import { ChartCard } from "../components/ChartCard";
import { ChartPicker } from "../components/ChartPicker";
import { CompareControls } from "../components/CompareControls";
import { FilterPanel } from "../components/FilterPanel";
import { GamePicker } from "../components/GamePicker";
import { Section } from "../components/Section";
import {
  EMPTY_AGE,
  buildChartParams,
  chartsOf,
  filtersSummary,
  findChartDef,
  groupByLabel,
  initialSelection,
  paramsKey,
  parseAge,
  selectChart,
  selectGame,
} from "../utils/selection";
import type { Catalog, ChartResult, Selection } from "../types";

type Shown = { result: ChartResult; subtitle: string; key: string };

export default function StatsPage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const resultRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const loadCatalog = useCallback(async () => {
    setCatalogError(null);

    const response = await getStatsCatalogAction();

    if (!response.success) {
      setCatalogError(response.message);
      return;
    }

    setCatalog(response.data);
    setSelection((current) => current ?? initialSelection(response.data));
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const chart = useMemo(
    () => (catalog && selection ? findChartDef(catalog, selection.chart) : undefined),
    [catalog, selection],
  );

  const params = useMemo(
    () =>
      catalog && selection && chart
        ? buildChartParams(selection, chart, catalog.ageLimits)
        : null,
    [catalog, selection, chart],
  );

  const currentKey = params ? paramsKey(params) : null;

  if (catalogError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-red-300">{catalogError}</p>
        <Button variant="outline" size="sm" onClick={() => void loadCatalog()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (!catalog || !selection || !chart || !params) {
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-400" role="status">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Cargando estadísticas…
      </p>
    );
  }

  const ageProblem = parseAge(selection.age, catalog.ageLimits);
  const needsStudents = selection.groupBy === "student" && selection.students.length === 0;
  const gameLabel = catalog.games.find((g) => g.id === selection.game)?.label ?? "";

  function toggle(step: number) {
    setOpen((current) => ({ ...current, [step]: !current[step] }));
  }

  function update(next: Selection) {
    setSelection(next);
  }

  async function show() {
    if (!catalog || !selection || !chart || !params) return;

    setLoading(true);
    setError(null);

    const response = await getStatsChartAction(params);

    setLoading(false);

    if (!response.success) {
      setError(response.message);
      return;
    }

    const partida = catalog.partidas.find((p) => p.value === selection.partida)?.label;

    setShown({
      result: response.data,
      key: paramsKey(params),
      subtitle: [
        gameLabel,
        groupByLabel(catalog, selection.groupBy),
        chart.usesPartida ? partida : null,
        chart.usesPartida && selection.partida === "all" && selection.countBy === "attempts" ? "Contando partidas" : null,
        chart.usesPeriod && selection.period !== "all"
          ? catalog.periods.find((p) => p.value === selection.period)?.label
          : null,
        filtersSummary(catalog, selection.filters, selection.age),
      ]
        .filter(Boolean)
        .join(" · "),
    });

    // En celular se pliega la seleccion (sus titulos siguen a la vista) para ver el grafico.
    if (!isDesktop) setOpen({});

    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  const charts = chartsOf(catalog, selection.game);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold text-white">Estadísticas</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Elige un juego y un gráfico, decide cómo verlo y presiona «Mostrar».
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <Section step={1} title="Juego" summary={gameLabel} open={!!open[1]} onToggle={() => toggle(1)}>
            <GamePicker
              catalog={catalog}
              value={selection.game}
              onChange={(game) => update(selectGame(catalog, selection, game))}
            />
          </Section>

          <Section step={2} title="Gráfico" summary={chart.title} open={!!open[2]} onToggle={() => toggle(2)}>
            <ChartPicker
              charts={charts}
              value={selection.chart}
              onChange={(id) => update(selectChart(catalog, selection, id))}
            />
          </Section>

          <Section
            step={3}
            title="Cómo verlo"
            summary={groupByLabel(catalog, selection.groupBy)}
            open={!!open[3]}
            onToggle={() => toggle(3)}
          >
            <CompareControls
              catalog={catalog}
              chart={chart}
              selection={selection}
              onChange={update}
            />
          </Section>

          <Section
            step={4}
            title="Filtros"
            summary={filtersSummary(catalog, selection.filters, selection.age)}
            open={!!open[4]}
            onToggle={() => toggle(4)}
          >
            <FilterPanel
              catalog={catalog}
              value={selection.filters}
              age={selection.age}
              onChange={(filters) => update({ ...selection, filters })}
              onAgeChange={(age) => update({ ...selection, age })}
              onClear={() => update({ ...selection, filters: {}, age: EMPTY_AGE })}
              hideDevice={!chart.supportsDevice}
            />
          </Section>

          <Button onClick={() => void show()} disabled={loading || needsStudents || !ageProblem.ok} size="md" className="w-full">
            {loading ? (
              <>
                <LoaderCircle aria-hidden="true" className="mr-2 size-4 animate-spin" />
                Calculando…
              </>
            ) : (
              "Mostrar"
            )}
          </Button>

          {!ageProblem.ok && (
            <p role="alert" className="text-xs text-red-300">
              Corrige la edad en «Filtros» para poder mostrar el gráfico.
            </p>
          )}

          {needsStudents && (
            <p className="text-xs text-zinc-400">Elige al menos un estudiante para compararlo.</p>
          )}
        </div>

        <div
          ref={resultRef}
          className="min-w-0 scroll-mt-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
        >
          {error && (
            <p role="alert" className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          {shown ? (
            <ChartCard
              key={shown.result.chart}
              result={shown.result}
              subtitle={shown.subtitle}
              loading={loading}
              stale={shown.key !== currentKey}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-400">
              El gráfico aparecerá aquí.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
