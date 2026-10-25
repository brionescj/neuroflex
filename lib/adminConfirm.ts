import { verifyPassword } from "./password";
import { AuthUser } from "./models/AuthUser";

export type Confirmation = { ok: true } | { ok: false; status: number; message: string };

/**
 * Confirma que quien tiene la sesion de administrador iniciada es quien esta
 * frente a la pantalla: se le pide su propia contraseña antes de una accion
 * delicada (generar la contraseña de otra persona). Un error de contraseña es
 * 403 y no 401: un 401 se lee como sesion vencida.
 */
export async function confirmAdminPassword(adminRut: string, adminPassword: unknown): Promise<Confirmation> {
  if (typeof adminPassword !== "string" || adminPassword === "") {
    return { ok: false, status: 400, message: "Ingrese su contraseña para confirmar." };
  }

  const self = await AuthUser.findOne({ rut: adminRut });

  if (!self || !(await verifyPassword(adminPassword, self.password))) {
    return { ok: false, status: 403, message: "Su contraseña no es correcta." };
  }

  return { ok: true };
}
