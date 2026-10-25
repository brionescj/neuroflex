import { AuthUser } from "./models/AuthUser";

export type Account = {
  id: string;
  rut: string;
  password: string;
  role: string;
  enabled: boolean;
};

/**
 * La cuenta de acceso de un RUT. Se leen solo los campos que el inicio de sesion
 * usa y sin armar el documento de Mongoose (.lean()): es una consulta menos pesada
 * en la ruta mas visitada de la aplicacion.
 */
export async function findAccount(rut: string): Promise<Account | null> {
  const account = (await AuthUser.findOne({ rut })
    .select("rut password role enabled")
    .lean()) as
    | { _id: { toString(): string }; rut: string; password: string; role: string; enabled: boolean }
    | null;

  if (!account) return null;

  return {
    id: account._id.toString(),
    rut: account.rut,
    password: account.password,
    role: account.role,
    enabled: account.enabled,
  };
}
