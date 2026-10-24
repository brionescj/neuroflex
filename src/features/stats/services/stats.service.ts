import { isAxiosError } from "axios";

import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import { fail, type ApiResponse } from "@/types";

import type { Catalog, ChartResult, StudentProfile } from "../types";

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

export function getStatsCatalog(): Promise<ApiResponse<Catalog>> {
  return get<Catalog>("/admin/stats/catalog");
}

/** Los parametros ya vienen como texto (los objetos van como JSON). */
export function getStatsChart(
  params: Record<string, string>,
): Promise<ApiResponse<ChartResult>> {
  return get<ChartResult>("/admin/stats/chart", params);
}

/** Todo lo de un estudiante: resumen, partida a partida y graficos de cada juego. */
export function getStudentProfile(rut: string): Promise<ApiResponse<StudentProfile>> {
  return get<StudentProfile>(`/admin/stats/students/${encodeURIComponent(rut)}`);
}
