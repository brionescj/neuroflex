import { isAxiosError } from "axios";

import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import { sharedRequest } from "@/lib/sharedRequest";
import { fail, type ApiResponse } from "@/types";

import type {
  AttemptState,
  Catalog,
  ChartResult,
  EvolutionBy,
  EvolutionSpan,
  GameId,
  HistoryPage,
  StudentEvolution,
  StudentProfile,
} from "../types";

/** Los calculos leen toda la coleccion de partidas: se les da mas tiempo que al resto. */
const STATS_TIMEOUT_MS = 30_000;

async function get<T>(
  path: string,
  params?: Record<string, string>,
): Promise<ApiResponse<T>> {
  try {
    const response = await api.get<ApiResponse<T>>(path, {
      params,
      timeout: STATS_TIMEOUT_MS,
    });

    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<T>(error.response);
    }

    return fail("No se pudo conectar con el servidor.");
  }
}

/**
 * Lo ya pedido se reutiliza un rato: Estadisticas y Desempeño leen el mismo catalogo, y se pide por
 * adelantado al abrir la sesion del administrador. Crear o modificar un estudiante lo descarta.
 */
const CATALOG_REUSE_MS = 60_000;
const PROFILE_REUSE_MS = 30_000;
const EVOLUTION_REUSE_MS = 60_000;

export function getStatsCatalog(): Promise<ApiResponse<Catalog>> {
  return sharedRequest("stats:catalog", () => get<Catalog>("/admin/stats/catalog"), CATALOG_REUSE_MS);
}

/** Los parametros ya vienen como texto (los objetos van como JSON). */
export function getStatsChart(
  params: Record<string, string>,
): Promise<ApiResponse<ChartResult>> {
  return get<ChartResult>("/admin/stats/chart", params);
}

/** Los estados que entran en los graficos de cada juego; lo que no se indica, entra completo. */
export type StatesByGame = Partial<Record<GameId, AttemptState[]>>;

/** Resumen y graficos de cada juego de un estudiante (el partida a partida y la evolucion se piden aparte). */
export function getStudentProfile(rut: string, states: StatesByGame = {}): Promise<ApiResponse<StudentProfile>> {
  const params: Record<string, string> = {};

  for (const [game, list] of Object.entries(states)) {
    if (list && list.length > 0) params[game] = list.join(",");
  }

  return sharedRequest(
    `stats:student:${rut}:${JSON.stringify(params)}`,
    () => get<StudentProfile>(`/admin/stats/students/${encodeURIComponent(rut)}`, params),
    PROFILE_REUSE_MS,
  );
}

/** Una pagina del partida a partida; `from` y `to` (AAAA-MM-DD) filtran por la fecha en que empezó la partida. */
export function getStudentHistory(
  rut: string,
  query: { page: number; from: string; to: string },
): Promise<ApiResponse<HistoryPage>> {
  const params: Record<string, string> = { page: String(query.page) };

  if (query.from !== "") params.from = query.from;
  if (query.to !== "") params.to = query.to;

  return get<HistoryPage>(`/admin/stats/students/${encodeURIComponent(rut)}/history`, params);
}

/** Los promedios del estudiante por semana o por mes. */
export function getStudentEvolution(
  rut: string,
  by: EvolutionBy,
  span: EvolutionSpan,
): Promise<ApiResponse<StudentEvolution>> {
  return sharedRequest(
    `stats:evolution:${rut}:${by}:${span}`,
    () => get<StudentEvolution>(`/admin/stats/students/${encodeURIComponent(rut)}/evolution`, { by, span }),
    EVOLUTION_REUSE_MS,
  );
}
