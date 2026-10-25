import { isAxiosError } from "axios";

import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import { forgetRequests, prefetchOnce, takePrefetched } from "@/lib/sharedRequest";
import { fail, type ApiResponse, type Admin } from "@/types";

export type CreateAdminPayload = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  password: string;
};

const LIST_KEY = "admin:admins";

/** Pide el listado por adelantado (al abrir la sesion del administrador); se recoge UNA vez al abrir el panel. */
export function prefetchAdmins(): void {
  prefetchOnce(LIST_KEY, requestAdmins, 30_000);
}

/** La primera vez toma lo pedido por adelantado; las siguientes (tras crear o editar) piden al servidor. */
export function listAdmins(): Promise<ApiResponse<Admin[]>> {
  return takePrefetched<ApiResponse<Admin[]>>(LIST_KEY) ?? requestAdmins();
}

async function requestAdmins(): Promise<ApiResponse<Admin[]>> {
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
    // Su ficha del perfil guardada ya no es la actual.
    forgetRequests("profile:");
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

export type UpdateAdminNamesPayload = {
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
};

export async function updateAdminNames(
  rut: string,
  payload: UpdateAdminNamesPayload,
): Promise<ApiResponse<Admin>> {
  try {
    const response = await api.patch<ApiResponse<Admin>>(
      `/admin/admins/${rut}`,
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

/** Genera una contraseña aleatoria para otro administrador; pide la contraseña de quien la genera para confirmar. */
export async function generateAdminPassword(
  rut: string,
  adminPassword: string,
): Promise<ApiResponse<{ password: string }>> {
  try {
    const response = await api.post<ApiResponse<{ password: string }>>(
      `/admin/admins/${rut}/password`,
      { adminPassword },
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<{ password: string }>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}
