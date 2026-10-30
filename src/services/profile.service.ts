import { isAxiosError } from "axios";

import type { AvatarId } from "@/config/avatars";
import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import { forgetRequests, sharedRequest } from "@/lib/sharedRequest";
import {
  fail,
  type ApiResponse,
  type Admin,
  type Student,
  type StudyShift,
  type UserRole,
} from "@/types";

export type ProfileDetails =
  | ({ role: "student" } & Student)
  | ({ role: "admin" } & Admin);

/** Cuanto se reutiliza la ficha ya pedida (al volver al perfil, o si se pidio por adelantado al iniciar sesion). */
const PROFILE_REUSE_MS = 120_000;

export const profileKey = (rut: string) => `profile:${rut}`;

export async function getProfileDetails(
  rut: string,
  _role: UserRole,
): Promise<ProfileDetails | null> {
  const result = await sharedRequest(
    profileKey(rut),
    async () => {
      try {
        const response = await api.get<ApiResponse<ProfileDetails>>(`/profile/${rut}`);

        return { success: true, data: response.data.data as ProfileDetails | null };
      } catch {
        return { success: false, data: null };
      }
    },
    PROFILE_REUSE_MS,
  );

  return result.data;
}

export type UpdateContactPayload = {
  rut: string;

  role: UserRole;

  email: string;

  avatarId: AvatarId;

  /** Solo estudiantes. AAAA-MM-DD; vacio la borra, ausente no la toca. */
  birthDate?: string;

  /** Solo estudiantes. Vacio la borra, ausente no la toca. */
  studyShift?: StudyShift | "";

  /** Solo estudiantes. Region con su nombre oficial; vacio la borra, ausente no la toca. */
  region?: string;

  /** Solo estudiantes. Comuna de esa region; vacio la borra, ausente no la toca. */
  comuna?: string;
};

type ContactData = {
  email: string;

  avatarId: AvatarId;

  /** Solo en la respuesta a un estudiante: lo que quedo guardado. */
  birthDate?: string;

  studyShift?: StudyShift;

  region?: string;

  comuna?: string;
};

export async function updateProfileContact(
  payload: UpdateContactPayload,
): Promise<ApiResponse<ContactData>> {
  try {
    const response = await api.patch<ApiResponse<ContactData>>(
      `/profile/${payload.rut}/contact`,
      {
        email: payload.email,
        avatarId: payload.avatarId,
        ...(payload.birthDate !== undefined && { birthDate: payload.birthDate }),
        ...(payload.studyShift !== undefined && { studyShift: payload.studyShift }),
        ...(payload.region !== undefined && { region: payload.region }),
        ...(payload.comuna !== undefined && { comuna: payload.comuna }),
      },
    );

    // La ficha guardada ya no es la actual.
    forgetRequests("profile:");

    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<ContactData>(error.response);
    }

    return fail("No se pudo conectar con el servidor.");
  }
}