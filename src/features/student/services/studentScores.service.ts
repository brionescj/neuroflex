import { isAxiosError } from "axios";

import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import { fail, type ApiResponse } from "@/types";

import type { StudentScores } from "../types";

export async function loadStudentScores(): Promise<ApiResponse<StudentScores>> {
  try {
    const response = await api.get<ApiResponse<StudentScores>>("/student/scores");
    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<StudentScores>(error.response);
    }
    return fail("No se pudo conectar con el servidor.");
  }
}
