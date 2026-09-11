import { isAxiosError } from "axios";

import { api } from "@/lib/axios";
import { fail, type ApiResponse } from "@/types";

export type RoleMatch = { role: "student" | "teacher" };

export async function findRoleByRut(
  rut: string,
): Promise<ApiResponse<RoleMatch>> {
  try {
    const response = await api.get<ApiResponse<RoleMatch>>(
      "/admin/find-role",
      { params: { rut } },
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return error.response.data as ApiResponse<RoleMatch>;
    }
    return fail("No se pudo conectar con el servidor.");
  }
}