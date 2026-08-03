import AuthRepository from "../repositories/auth.repository";
import type { ApiResponse } from "@/types/api";
import type { User } from "@/types/user";

interface LoginPayload {
  rut: string;
  password: string;
}

export async function loginService(
  payload: LoginPayload,
): Promise<ApiResponse<User | null>> {
  const user = await AuthRepository.getUserByRut(payload.rut);

  if (!user) {
    return {
      success: false,
      message: "Usuario no encontrado.",
      data: null,
    };
  }

  if (!user.active) {
    return {
      success: false,
      message: "Usuario inactivo.",
      data: null,
    };
  }

  /**
   * Temporal.
   *
   * Más adelante utilizaremos bcrypt
   * y la contraseña vendrá hasheada desde MongoDB.
   */
  if (user.password !== payload.password) {
    return {
      success: false,
      message: "Contraseña incorrecta.",
      data: null,
    };
  }

  return {
    success: true,
    message: "Inicio de sesión correcto.",
    data: user,
  };
}