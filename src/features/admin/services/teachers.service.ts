import { isAxiosError } from "axios";

import { api } from "@/lib/axios";
import { fail, type ApiResponse, type Teacher } from "@/types";

export type CreateTeacherPayload = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
};

export async function listTeachers(): Promise<ApiResponse<Teacher[]>> {
  try {
    const response = await api.get<ApiResponse<Teacher[]>>("/admin/teachers");
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return error.response.data as ApiResponse<Teacher[]>;
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

export async function createTeacher(
  payload: CreateTeacherPayload,
): Promise<ApiResponse<Teacher>> {
  try {
    const response = await api.post<ApiResponse<Teacher>>(
      "/admin/teachers",
      payload,
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return error.response.data as ApiResponse<Teacher>;
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

export async function setTeacherEnabled(
  rut: string,
  enabled: boolean,
): Promise<ApiResponse<Teacher>> {
  try {
    const response = await api.patch<ApiResponse<Teacher>>(
      `/admin/teachers/${rut}/status`,
      { enabled },
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return error.response.data as ApiResponse<Teacher>;
    }
    return fail("No se pudo conectar con el servidor.");
  }
}