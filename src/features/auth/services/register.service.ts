import { isAxiosError } from "axios";

import { api } from "@/lib/axios";
import { fail, type ApiResponse } from "@/types";

export type RegisterPayload = {
  rut: string;

  password: string;
};

export async function registerService(
  payload: RegisterPayload,
): Promise<ApiResponse<{ rut: string }>> {
  try {
    const response = await api.post<ApiResponse<{ rut: string }>>(
      "/auth/register",
      payload,
    );

    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return error.response.data as ApiResponse<{ rut: string }>;
    }

    return fail("No se pudo conectar con el servidor.");
  }
}