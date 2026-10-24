import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { getStatsCatalogAction, getStudentProfileAction } from "../actions/stats.action";
import { ChartCard } from "../components/ChartCard";
import { RowsTable } from "../components/charts/ChartTable";
import { StatCards } from "../components/charts/StatCards";
import { StudentSearch } from "../components/StudentSearch";
import type { Catalog, StudentProfile } from "../types";

const PANEL = "viz-root rounded-2xl border border-white/10 bg-[var(--viz-surface)] p-4 text-[var(--viz-text)]";

type Loaded = { rut: string; profile: StudentProfile };

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-200">{value === "" ? "—" : value}</dd>
    </div>
  );
}

export default function StudentStatsPage() {
  const [params, setParams] = useSearchParams();
  const rut = params.get("rut") ?? "";
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadingRut, setLoadingRut] = useState<string | null>(null);
  const [error, setError] = useState<{ rut: string; message: string } | null>(null);
  // Solo vale la ultima respuesta pedida: si se cambia de estudiante, las anteriores se descartan.
  const latest = useRef(0);

  const loadCatalog = useCallback(async () => {
    setCatalogError(null);

    const response = await getStatsCatalogAction();

    if (!response.success) {
      setCatalogError(response.message);
      return;
    }

    setCatalog(response.data);
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const loadProfile = useCallback(async (target: string) => {
    const ticket = ++latest.current;

    setLoadingRut(target);
    setError(null);

    const response = await getStudentProfileAction(target);

    if (ticket !== latest.current) return;

    setLoadingRut(null);

    if (!response.success) {
      setError({ rut: target, message: response.message });
      return;
    }

    setLoaded({ rut: target, profile: response.data });
  }, []);

  useEffect(() => {
    if (rut !== "") void loadProfile(rut);
  }, [rut, loadProfile]);

  function select(next: string) {
    setParams({ rut: next });
  }

  const loading = loadingRut !== null;
  const profile = loaded && loaded.rut === rut ? loaded.profile : null;
  const failure = error && error.rut === rut ? error.message : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold text-white">Desempeño por estudiante</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Elige a un estudiante para ver cómo ha ido jugando, en qué falla y cómo se compara con su grupo.
        </p>
      </header>

      <section aria-label="Elegir estudiante" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        {catalogError ? (
          <div className="flex flex-col items-start gap-3">
            <p role="alert" className="text-sm text-red-300">{catalogError}</p>
            <Button variant="outline" size="sm" onClick={() => void loadCatalog()}>
              Reintentar
            </Button>
          </div>
        ) : catalog ? (
          <StudentSearch students={catalog.students} onSelect={select} />
        ) : (
          <p className="flex items-center gap-2 text-sm text-zinc-400" role="status">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Cargando estudiantes…
          </p>
        )}
      </section>

      {rut === "" && (
        <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          Aún no elegiste a nadie. Busca un estudiante arriba o toca un RUT en las listas de «Estadísticas».
        </p>
      )}

      {rut !== "" && loading && !profile && (
        <p className="flex items-center gap-2 text-sm text-zinc-400" role="status">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Calculando el desempeño…
        </p>
      )}

      {failure && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-red-300">{failure}</p>
          <Button variant="outline" size="sm" onClick={() => void loadProfile(rut)}>
            Reintentar
          </Button>
        </div>
      )}

      {profile && (
        <div className={cn("flex flex-col gap-4 transition-opacity", loading && "opacity-50")} aria-busy={loading}>
          <section aria-label="Datos del estudiante" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-white">{profile.student.name}</h2>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  profile.student.enabled
                    ? "border-emerald-400/40 text-emerald-400"
                    : "border-rose-400/40 text-rose-400",
                )}
              >
                {profile.student.enabled ? "Habilitado" : "Deshabilitado"}
              </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-5">
              <Detail label="RUT" value={profile.student.rut} />
              <Detail label="Paralelo" value={profile.student.paralelo === null ? "" : String(profile.student.paralelo)} />
              <Detail label="Universidad" value={profile.student.university} />
              <Detail label="Jornada" value={profile.student.shift} />
              <Detail label="Ciudad" value={profile.student.ciudad} />
            </dl>
          </section>

          <section aria-label="Resumen" className={PANEL}>
            <h2 className="mb-3 text-base font-semibold">Resumen</h2>
            <StatCards cards={profile.cards} />
          </section>

          <section aria-label="Partida a partida" className={PANEL}>
            <h2 className="text-base font-semibold">Partida a partida</h2>
            <p className="mb-3 mt-0.5 text-xs text-[var(--viz-text-2)]">
              Cada vez que jugó, de la más reciente a la más antigua.
            </p>
            <RowsTable
              caption="Partidas jugadas"
              columns={profile.history.columns}
              rows={profile.history.rows}
              emptyText="Este estudiante aún no ha jugado."
            />
          </section>

          {profile.games.map((game) => (
            <section key={game.game} aria-label={game.label} className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-white">{game.label}</h2>

              {game.played ? (
                game.charts.map((chart) => (
                  <ChartCard
                    key={chart.id}
                    result={chart.result}
                    description={chart.description}
                    subtitle={`${game.label} · solo ${profile.student.name}`}
                    loading={false}
                    stale={false}
                  />
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                  Aún no ha jugado {game.label}.
                </p>
              )}
            </section>
          ))}

          {profile.notes.length > 0 && (
            <details className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-zinc-400">
              <summary className="cursor-pointer select-none py-1 text-zinc-300">Cómo se calculó</summary>

              <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
                {profile.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
