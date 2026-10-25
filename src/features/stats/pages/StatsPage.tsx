import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context";
import { useMediaQuery } from "@/hooks/useMediaQuery";

import { getStatsCatalogAction, getStatsChartAction } from "../actions/stats.action";
import { ChartCard } from "../components/ChartCard";
import { ChartPicker } from "../components/ChartPicker";
import { ChartSettings } from "../components/ChartSettings";
import { ComparePanel } from "../components/ComparePanel";
import { GamePicker } from "../components/GamePicker";
import { Section } from "../components/Section";
import {
  buildChartParams,
  chartsOf,
  compareSummary,
  comparedDimensions,
  filtersSummary,
  findChartDef,
  initialSelection,
  paramsKey,
  parseAge,
  periodText,
  selectChart,
  selectGame,
  canChooseCount,
  partidaText,
  timeProblem,
} from "../utils/selection";
import { recallStats, rememberStats } from "../utils/statsMemory";
import type { Catalog, ChartResult, Selection } from "../types";

type Shown = { result: ChartResult; subtitle: string; key: string };

export default function StatsPage() {
  const { user } = useAuth();
  const owner = user?.rut ?? "";
  // Lo que la vista dejó al irse a otra pestaña: al volver aparece tal cual estaba, sin recargar.
  const [saved] = useState(() => recallStats(owner));
  const [catalog, setCatalog] = useState<Catalog | null>(saved?.catalog ?? null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(saved?.selection ?? null);
  const [shown, setShown] = useState<Shown | null>(saved?.shown ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>(saved?.open ?? {});
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
    // Lo recordado vale solo si ese gráfico todavía existe en el catálogo; si no, se parte de cero.
    setSelection((current) => (current && findChartDef(response.data, current.chart) ? current : initialSelection(response.data)));
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    rememberStats({ owner, catalog, selection, shown, open });
  }, [owner, catalog, selection, shown, open]);

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

  // «Mostrar». `resume`: se vuelve a pedir el gráfico que estaba a la vista antes de que el navegador
  // recargara la página; no se pliega la selección ni se desplaza la pantalla (ya estaba como la dejó la persona).
  async function show(resume = false) {
    if (!catalog || !selection || !chart || !params) return;

    const gameName = catalog.games.find((g) => g.id === selection.game)?.label ?? "";
    const comparing = chart.canCompare ? comparedDimensions(selection) : [];

    setLoading(true);
    setError(null);

    const response = await getStatsChartAction(params);

    setLoading(false);

    if (!response.success) {
      setError(response.message);
      return;
    }

    setShown({
      result: response.data,
      key: paramsKey(params),
      subtitle: [
        gameName,
        chart.canCompare && selection.groupBy !== "none" ? compareSummary(catalog, selection) : null,
        chart.usesPartida ? partidaText(selection) : null,
        chart.usesPartida && canChooseCount(selection) && selection.countBy === "attempts" ? "Contando partidas" : null,
        chart.usesPeriod && selection.groupBy !== "dateRange" ? periodText(catalog, selection) : null,
        filtersSummary(catalog, selection.filters, selection.age, comparing) === "Sin acotar"
          ? null
          : filtersSummary(catalog, selection.filters, selection.age, comparing),
      ]
        .filter(Boolean)
        .join(" · "),
    });

    if (resume) return;

    // En celular se pliega la seleccion (sus titulos siguen a la vista) para ver el grafico.
    if (!isDesktop) setOpen({});

    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  // Tras una recarga de la página (en el celular, al apagar y encender la pantalla) el gráfico que
  // estaba a la vista se pide de nuevo apenas hay catálogo y selección.
  const showRef = useRef(show);
  const resuming = useRef(saved?.resume === true);

  showRef.current = show;

  useEffect(() => {
    if (!resuming.current || !params || shown !== null) return;

    resuming.current = false;
    void showRef.current(true);
  }, [params, shown]);

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
  // Partida y fechas: con un numero de partida hay que elegir el periodo antes de mostrar.
  const timeIssue = timeProblem(selection, chart, catalog.maxPartida);
  const gameLabel = catalog.games.find((g) => g.id === selection.game)?.label ?? "";

  function toggle(step: number) {
    setOpen((current) => ({ ...current, [step]: !current[step] }));
  }

  function update(next: Selection) {
    setSelection(next);
  }

  const charts = chartsOf(catalog, selection.game);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold text-white">Estadísticas</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Elige un juego y un gráfico, compáralo si quieres y presiona «Mostrar».
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

          <Section
            step={2}
            title="Gráfico"
            summary={[chart.title, chart.canCompare && selection.groupBy !== "none" ? compareSummary(catalog, selection) : null]
              .filter(Boolean)
              .join(" · ")}
            open={!!open[2]}
            onToggle={() => toggle(2)}
            help={{ label: `Qué muestra «${chart.title}»`, text: chart.blurb }}
          >
            <ChartPicker
              charts={charts}
              value={selection.chart}
              onChange={(id) => update(selectChart(catalog, selection, id))}
            />

            <div className="mt-4 flex flex-col gap-4">
              <ChartSettings catalog={catalog} chart={chart} selection={selection} onChange={update} />

              <ComparePanel
                catalog={catalog}
                chart={chart}
                selection={selection}
                onChange={update}
                open={!!open[3]}
                onToggle={() => toggle(3)}
              />
            </div>
          </Section>

          <Button onClick={() => void show()} disabled={loading || needsStudents || !ageProblem.ok || timeIssue !== null} size="md" className="w-full">
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
              Corrige la edad en «Gráfico», dentro de «Comparar este gráfico», para poder mostrarlo.
            </p>
          )}

          {timeIssue !== null && (
            <p role="status" className="text-xs text-amber-200">
              {timeIssue} Se completa en «Gráfico».
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
              description={catalog.games.flatMap((g) => g.charts).find((c) => c.id === shown.result.chart)?.blurb ?? ""}
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
