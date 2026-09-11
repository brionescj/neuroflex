import { isAxiosError } from "axios";

import { api } from "@/lib/axios";
import { fail, type ApiResponse, type SessionUser } from "@/types";

export type LoginPayload = {
  rut: string;

  password: string;
};

export async function loginService(
  payload: LoginPayload,
): Promise<ApiResponse<SessionUser>> {
  try {
    const response = await api.post<ApiResponse<SessionUser>>(
      "/auth/login",
      payload,
    );

    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return error.response.data as ApiResponse<SessionUser>;
    }

    return fail("No se pudo conectar con el servidor.");
  }
}