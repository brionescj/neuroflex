import { authRepository } from "@/repositories";
import { buildDisplayName, findProfile } from "@/services/profile.service";
import { fail, ok, type ApiResponse, type SessionUser } from "@/types";
import { normalizeForDatabase } from "@/utils/rut";

export type LoginPayload = {
  rut: string;

  password: string;
};

export async function loginService(
  payload: LoginPayload,
): Promise<ApiResponse<SessionUser>> {
  const rut = normalizeForDatabase(payload.rut);

  const account = await authRepository.findByRut(rut);

  /**
   * Mensaje generico a proposito.
   *
   * Decir "el RUT no existe" permite enumerar usuarios.
   */
  if (!account || account.password !== payload.password) {
    return fail("RUT o contrasena incorrectos.");
  }

  if (!account.enabled) {
    return fail("Su cuenta se encuentra deshabilitada.");
  }

  const profile = await findProfile(rut, account.role);

  if (!profile || !profile.enabled) {
    return fail("Su ficha institucional no se encuentra activa.");
  }

  const session: SessionUser = {
    id: account.id,
    rut: account.rut,
    role: account.role,
    displayName: buildDisplayName(profile),
    avatarId: profile.avatarId,
  };

  return ok(session, "Inicio de sesion correcto.");
}
