import { isAxiosError } from "axios";

import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import { fail, type ApiResponse, type Admin } from "@/types";

export type CreateAdminPayload = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  password: string;
};

export async function listAdmins(): Promise<ApiResponse<Admin[]>> {
  try {
    const response = await api.get<ApiResponse<Admin[]>>("/admin/admins");
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<Admin[]>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

export async function createAdmin(
  payload: CreateAdminPayload,
): Promise<ApiResponse<Admin>> {
  try {
    const response = await api.post<ApiResponse<Admin>>(
      "/admin/admins",
      payload,
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<Admin>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

export async function setAdminEnabled(
  rut: string,
  enabled: boolean,
): Promise<ApiResponse<Admin>> {
  try {
    const response = await api.patch<ApiResponse<Admin>>(
      `/admin/admins/${rut}/status`,
      { enabled },
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<Admin>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}