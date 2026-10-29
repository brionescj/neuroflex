import { isAxiosError } from "axios";

import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import { forgetRequests } from "@/lib/sharedRequest";
import { fail, type AdminMiniCase, type ApiResponse, type SaveMiniCasePayload } from "@/types";

export async function listMiniCases(): Promise<ApiResponse<AdminMiniCase[]>> {
  try {
    const response = await api.get<ApiResponse<AdminMiniCase[]>>("/admin/mini-cases");
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<AdminMiniCase[]>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

/** Crea el caso (sin `caseKey`) o actualiza el existente. */
export async function saveMiniCase(payload: SaveMiniCasePayload): Promise<ApiResponse<AdminMiniCase>> {
  try {
    const response = await api.post<ApiResponse<AdminMiniCase>>("/admin/mini-cases", payload);

    // El banco que el estudiante tenia pedido por adelantado ya no es el actual.
    forgetRequests("mini-cases:");

    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<AdminMiniCase>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}
