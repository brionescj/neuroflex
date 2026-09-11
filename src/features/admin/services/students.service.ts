import { isAxiosError } from "axios";

import { api } from "@/lib/axios";
import { fail, type ApiResponse, type Student } from "@/types";

export type CreateStudentPayload = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  paralelo: 1 | 2 | 3 | 4;
  ciudad?: string;
  region?: string;
  celular?: string;
  email?: string;
};

export type UpdateStudentDetailsPayload = {
  ciudad?: string;
  region?: string;
  celular?: string;
};

export async function updateStudentDetails(
  rut: string,
  payload: UpdateStudentDetailsPayload,
): Promise<ApiResponse<Student>> {
  try {
    const response = await api.patch<ApiResponse<Student>>(
      `/admin/students/${rut}/details`,
      payload,
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return error.response.data as ApiResponse<Student>;
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

export async function listStudents(): Promise<ApiResponse<Student[]>> {
  try {
    const response = await api.get<ApiResponse<Student[]>>("/admin/students");
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return error.response.data as ApiResponse<Student[]>;
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

export async function createStudent(
  payload: CreateStudentPayload,
): Promise<ApiResponse<Student>> {
  try {
    const response = await api.post<ApiResponse<Student>>(
      "/admin/students",
      payload,
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return error.response.data as ApiResponse<Student>;
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

export async function setStudentEnabled(
  rut: string,
  enabled: boolean,
): Promise<ApiResponse<Student>> {
  try {
    const response = await api.patch<ApiResponse<Student>>(
      `/admin/students/${rut}/status`,
      { enabled },
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return error.response.data as ApiResponse<Student>;
    }
    return fail("No se pudo conectar con el servidor.");
  }
}