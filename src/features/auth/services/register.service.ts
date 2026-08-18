import { authRepository, studentRepository } from "@/repositories";
import { fail, ok, type ApiResponse } from "@/types";
import { normalizeForDatabase } from "@/utils/rut";

export type RegisterPayload = {
  rut: string;

  password: string;
};

/**
 * Regla del proyecto:
 * solo puede registrarse un estudiante ya cargado por la universidad.
 */
export async function registerService(
  payload: RegisterPayload,
): Promise<ApiResponse<{ rut: string }>> {
  const rut = normalizeForDatabase(payload.rut);

  const student = await studentRepository.findByRut(rut);

  if (!student) {
    return fail(
      "Este RUT no figura en la nomina de la universidad.",
    );
  }

  if (!student.enabled) {
    return fail(
      "Su matricula no se encuentra activa. Contacte a la universidad.",
    );
  }

  const alreadyHasAccount = await authRepository.existsByRut(rut);

  if (student.registered || alreadyHasAccount) {
    return fail("Este RUT ya posee una cuenta. Inicie sesion.");
  }

  await authRepository.create({
    rut,
    password: payload.password,
    role: "student",
  });

  await studentRepository.markAsRegistered(rut);

  return ok({ rut }, "Cuenta creada correctamente.");
}
