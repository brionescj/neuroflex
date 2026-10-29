import { isAxiosError } from "axios";

import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import { forgetRequests, prefetchOnce, takePrefetched } from "@/lib/sharedRequest";
import {
  fail,
  type ApiResponse,
  type Gender,
  type Paralelo,
  type Student,
  type StudyShift,
  type University,
} from "@/types";

export type CreateStudentPayload = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  paralelo: Paralelo;
  ciudad?: string;
  region?: string;
  celular?: string;
  email?: string;
  gender?: Gender;
  university?: University;
  studyShift?: StudyShift;
  /** AAAA-MM-DD. */
  birthDate?: string;
};

/**
 * Un campo ausente no se toca; uno vacio ("") se borra de la ficha. Los nombres y
 * apellidos no se pueden borrar: el servidor los rechaza vacios.
 */
export type UpdateStudentDetailsPayload = {
  firstName?: string;
  paternalLastName?: string;
  maternalLastName?: string;
  ciudad?: string;
  region?: string;
  celular?: string;
  email?: string;
  gender?: Gender | "";
  university?: University | "";
  studyShift?: StudyShift | "";
  /** AAAA-MM-DD. */
  birthDate?: string;
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
    // Las estadisticas (lista de estudiantes del catalogo) ya no estan al dia.
    forgetRequests("stats:");
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<Student>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

const LIST_KEY = "admin:students";

/** Pide el listado por adelantado (al abrir la sesion del administrador); se recoge UNA vez al abrir el panel. */
export function prefetchStudents(): void {
  prefetchOnce(LIST_KEY, requestStudents, 30_000);
}

/** La primera vez toma lo pedido por adelantado; las siguientes (tras crear o editar) piden al servidor. */
export function listStudents(): Promise<ApiResponse<Student[]>> {
  return takePrefetched<ApiResponse<Student[]>>(LIST_KEY) ?? requestStudents();
}

async function requestStudents(): Promise<ApiResponse<Student[]>> {
  try {
    const response = await api.get<ApiResponse<Student[]>>("/admin/students");
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<Student[]>(error.response);
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
    // Las estadisticas (lista de estudiantes del catalogo) ya no estan al dia.
    forgetRequests("stats:");
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<Student>(error.response);
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
    // Las estadisticas (lista de estudiantes del catalogo) ya no estan al dia.
    forgetRequests("stats:");
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<Student>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}

/** La contraseña nueva de un estudiante, tal como la entrega el servidor (una sola vez). */
export type GeneratedStudentPassword = {
  password: string;
  /** El estudiante aun no tenia cuenta: se le creo con esta contraseña. */
  createdAccount: boolean;
};

/** Genera una contraseña aleatoria para el estudiante; pide la contraseña del administrador para confirmar. */
export async function generateStudentPassword(
  rut: string,
  adminPassword: string,
): Promise<ApiResponse<GeneratedStudentPassword>> {
  try {
    const response = await api.post<ApiResponse<GeneratedStudentPassword>>(
      `/admin/students/${rut}/password`,
      { adminPassword },
    );
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<GeneratedStudentPassword>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}
