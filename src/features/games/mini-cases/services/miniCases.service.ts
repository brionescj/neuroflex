import { isAxiosError } from "axios";

import { api } from "@/lib/axios";
import { fail, type ApiResponse } from "@/types";
import type { ApiMiniCase, MiniCaseSubmitResult } from "../types";

export async function fetchMiniCases(): Promise<ApiResponse<ApiMiniCase[]>> {
  try {
    const response = await api.get<ApiResponse<ApiMiniCase[]>>("/mini-cases");
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return error.response.data as ApiResponse<ApiMiniCase[]>;
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
      return error.response.data as ApiResponse<MiniCaseSubmitResult>;
    }
    return fail("No se pudo conectar con el servidor.");
  }
}
