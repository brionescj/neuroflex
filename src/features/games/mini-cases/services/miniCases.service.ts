import { isAxiosError } from "axios";

import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import { prefetchOnce, takePrefetched } from "@/lib/sharedRequest";
import { fail, type ApiResponse } from "@/types";
import type { ApiMiniCase, MiniCaseSubmitResult } from "../types";

const BANK_KEY = "mini-cases:bank";

/**
 * Pide el banco por adelantado (al mostrarse el menu, si el estudiante ya tiene Mini casos). El servidor lo
 * baraja en cada respuesta: lo pedido por adelantado se recoge UNA sola vez, como cualquier otra respuesta,
 * y despues cada apertura del juego pide el suyo.
 */
export function prefetchMiniCases(): void {
  prefetchOnce(BANK_KEY, requestMiniCases, 60_000);
}

export function fetchMiniCases(): Promise<ApiResponse<ApiMiniCase[]>> {
  return takePrefetched<ApiResponse<ApiMiniCase[]>>(BANK_KEY) ?? requestMiniCases();
}

async function requestMiniCases(): Promise<ApiResponse<ApiMiniCase[]>> {
  try {
    const response = await api.get<ApiResponse<ApiMiniCase[]>>("/mini-cases");
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<ApiMiniCase[]>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

export async function submitMiniCaseOrder(
  caseKey: string,
  orderedOptionKeys: string[],
): Promise<ApiResponse<MiniCaseSubmitResult>> {
  try {
    const response = await api.post<ApiResponse<MiniCaseSubmitResult>>(
      `/mini-cases/${caseKey}/submit`,
      { orderedOptionKeys },
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<MiniCaseSubmitResult>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}
