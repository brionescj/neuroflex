import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context";
import { cn } from "@/lib/utils";

import { getStatsCatalogAction, getStudentProfileAction } from "../actions/stats.action";
import { StatCards } from "../components/charts/StatCards";
import { ChartViews } from "../components/ChartViews";
import { GameSection } from "../components/GameSection";
import { HistoryTable } from "../components/HistoryTable";
import { StudentTable } from "../components/StudentTable";
import { SummaryPdfButton } from "../components/SummaryPdfButton";
import type { StatesByGame } from "../services/stats.service";
import type { AttemptState, Catalog, GameId, StudentProfile } from "../types";
import { recallDesempeno, rememberDesempeno } from "../utils/desempenoMemory";

const PANEL = "viz-root rounded-2xl border border-white/10 bg-[var(--viz-surface)] p-4 text-[var(--viz-text)]";

const NO_STATES: StatesByGame = {};

/** `key`: las partidas elegidas con que se calculó; si cambian, hay que recalcular a la vista. */
type Loaded = { rut: string; profile: StudentProfile; key: string };

/** Las partidas que el admin dejó entrar en los gráficos de cada juego, para un estudiante. */
type StatesChoice = { rut: string; states: StatesByGame };

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-200">{value === "" ? "—" : value}</dd>
    </div>
  );
}

export default function StudentStatsPage() {
  const { user } = useAuth();
  const owner = user?.rut ?? "";
  const [params, setParams] = useSearchParams();
  // Lo que la vista dejó al irse a otra pestaña (el buscador, a quién miraba, lo ya calculado).
  const [saved] = useState(() => recallDesempeno(owner));
  const explicit = params.get("rut");
  // El estudiante al que se vuelve mientras la dirección todavía no lleva su RUT (se escribe justo al entrar).
  const [pending, setPending] = useState(saved?.rut ?? "");
  const rut = explicit ?? pending;
  const [catalog, setCatalog] = useState<Catalog | null>(saved?.catalog ?? null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(() => {
    const target = explicit ?? saved?.rut ?? "";

    return saved?.profile && saved.profile.rut === target ? saved.profile : null;
  });
  // La lista se pliega al elegir a alguien; «Cambiar estudiante» la vuelve a abrir.
  const [choosing, setChoosing] = useState(explicit === null && saved?.choosing === true);
  const [loadingRut, setLoadingRut] = useState<string | null>(null);
  const [error, setError] = useState<{ rut: string; message: string } | null>(null);
  const [choice, setChoice] = useState<StatesChoice>(saved?.choice ?? { rut: "", states: {} });
  const [query, setQuery] = useState(saved?.query ?? "");
  const [tablePage, setTablePage] = useState(saved?.page ?? 0);
  // Solo vale la ultima respuesta pedida: si se cambia de estudiante, las anteriores se descartan.
  const latest = useRef(0);
  // Lo que ya se tiene del mismo estudiante (por ejemplo, lo que dejó la memoria) se muestra de inmediato
  // y se actualiza por debajo, sin atenuar la pantalla.
  const loadedRef = useRef(loaded);

  loadedRef.current = loaded;

  // Al volver sin elegir a nadie, se vuelve al estudiante que se miraba (antes de pintar, para que no parpadee la lista).
  useLayoutEffect(() => {
    if (explicit === null && pending !== "") setParams({ rut: pending }, { replace: true });
    else if (explicit !== null && pending !== "") setPending("");
  }, [explicit, pending, setParams]);

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

  const loadProfile = useCallback(async (target: string, states: StatesByGame, silent = false) => {
    const ticket = ++latest.current;

    if (!silent) {
      setLoadingRut(target);
      setError(null);
    }

    const response = await getStudentProfileAction(target, states);

    if (ticket !== latest.current) return;

    setLoadingRut(null);

    if (!response.success) {
      if (!silent) setError({ rut: target, message: response.message });
      return;
    }

    setLoaded({ rut: target, profile: response.data, key: JSON.stringify(states) });
  }, []);

  // Los estados elegidos valen solo para el estudiante abierto: al cambiar de estudiante vuelven a «todas».
  const states = choice.rut === rut ? choice.states : NO_STATES;

  useEffect(() => {
    if (rut === "") return;

    const have = loadedRef.current;

    void loadProfile(rut, states, have !== null && have.rut === rut && have.key === JSON.stringify(states));
  }, [rut, states, loadProfile]);

  useEffect(() => {
    rememberDesempeno({ owner, rut, choosing, query, page: tablePage, catalog, profile: loaded, choice });
  }, [owner, rut, choosing, query, tablePage, catalog, loaded, choice]);

  function chooseStates(game: GameId, next: AttemptState[]) {
    setChoice({ rut, states: { ...states, [game]: next } });
  }

  function select(next: string) {
    setChoosing(false);
    setParams({ rut: next });
  }

  const loading = loadingRut !== null;
  const profile = loaded && loaded.rut === rut ? loaded.profile : null;
  const failure = error && error.rut === rut ? error.message : null;
  const showTable = rut === "" || choosing;
  const totalPartidas = profile ? profile.games.reduce((sum, game) => sum + game.attempts, 0) : 0;
  const chosen = catalog?.studentTable.find((student) => student.rut === rut);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold text-white">Desempeño por estudiante</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Elige a un estudiante para ver cómo ha ido jugando y en qué le cuesta.
        </p>
      </header>

      <section aria-label="Elegir estudiante" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        {!catalog && catalogError ? (
          <div className="flex flex-col items-start gap-3">
            <p role="alert" className="text-sm text-red-300">{catalogError}</p>
            <Button variant="outline" size="sm" onClick={() => void loadCatalog()}>
              Reintentar
            </Button>
          </div>
        ) : !catalog ? (
          <p className="flex items-center gap-2 text-sm text-zinc-400" role="status">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Cargando estudiantes…
          </p>
        ) : showTable ? (
          <StudentTable
            students={catalog.studentTable}
            selected={rut}
            onSelect={select}
            query={query}
            page={tablePage}
            onQueryChange={setQuery}
            onPageChange={setTablePage}
          />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 text-sm text-zinc-300">
              Estudiante:{" "}
              <span className="font-medium text-white">{profile?.student.name ?? chosen?.name ?? rut}</span>
              <span className="text-zinc-500"> · {rut}</span>
            </p>
            <Button variant="outline" size="sm" onClick={() => setChoosing(true)}>
              Cambiar estudiante
            </Button>
          </div>
        )}
      </section>

      {rut !== "" && loading && !profile && (
        <p className="flex items-center gap-2 text-sm text-zinc-400" role="status">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Calculando el desempeño…
        </p>
      )}

      {failure && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm text-red-300">{failure}</p>
          <Button variant="outline" size="sm" onClick={() => void loadProfile(rut, states)}>
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
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Resumen</h2>
              <SummaryPdfButton profile={profile} />
            </div>
            <StatCards cards={profile.cards} />

            {profile.notes.length > 0 && (
              <details className="mt-4 text-xs text-[var(--viz-text-2)]">
                <summary className="cursor-pointer select-none py-1 text-[var(--viz-muted)] hover:text-[var(--viz-text-2)]">
                  Cómo se calculó
                </summary>

                <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
                  {profile.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <GameSection
            title="Partida a partida"
            keepMounted
            empty={totalPartidas === 0}
            summary={
              totalPartidas === 0
                ? "Aún no ha jugado"
                : `${totalPartidas} ${totalPartidas === 1 ? "partida" : "partidas"} · de la más reciente a la más antigua`
            }
          >
            <div className="viz-root rounded-xl bg-[var(--viz-surface)] p-3 text-[var(--viz-text)]">
              <HistoryTable key={rut} rut={rut} />
            </div>
          </GameSection>

          <ChartViews key={`graficos-${rut}`} rut={rut} profile={profile} onChooseStates={chooseStates} />
        </div>
      )}
    </div>
  );
}
