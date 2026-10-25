import { isAxiosError } from "axios";

import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import { fail, type ApiResponse } from "@/types";

export type ChangePasswordPayload = {
  currentPassword: string;

  newPassword: string;
};

export async function changePasswordService(
  payload: ChangePasswordPayload,
): Promise<ApiResponse<null>> {
  try {
    const response = await api.post<ApiResponse<null>>("/auth/password", payload);

    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<null>(error.response);
    }

    return fail("No se pudo conectar con el servidor.");
  }
}
