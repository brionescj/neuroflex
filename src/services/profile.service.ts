import { isAxiosError } from "axios";

import type { AvatarId } from "@/config/avatars";
import { responseFromError } from "@/lib/apiError";
import { api } from "@/lib/axios";
import {
  fail,
  type ApiResponse,
  type Admin,
  type Student,
  type UserRole,
} from "@/types";

export type ProfileDetails =
  | ({ role: "student" } & Student)
  | ({ role: "admin" } & Admin);

export async function getProfileDetails(
  rut: string,
  _role: UserRole,
): Promise<ProfileDetails | null> {
  try {
    const response = await api.get<ApiResponse<ProfileDetails>>(
      `/profile/${rut}`,
    );

    return response.data.data;
  } catch {
    return null;
  }
}

export type UpdateContactPayload = {
  rut: string;

  role: UserRole;

  email: string;

  avatarId: AvatarId;
};

type ContactData = {
  email: string;

  avatarId: AvatarId;
};

export async function updateProfileContact(
  payload: UpdateContactPayload,
): Promise<ApiResponse<ContactData>> {
  try {
    const response = await api.patch<ApiResponse<ContactData>>(
      `/profile/${payload.rut}/contact`,
      { email: payload.email, avatarId: payload.avatarId },
    );

    return response.data;
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return responseFromError<ContactData>(error.response);
    }

    return fail("No se pudo conectar con el servidor.");
  }
}