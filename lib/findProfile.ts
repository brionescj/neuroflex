import { Student } from "./models/Student.js";
import { Admin } from "./models/Admin.js";

/** La ficha de una cuenta segun su rol. Un rol que ya no existe no tiene ficha. */
export async function findProfile(rut: string, role: string) {
  if (role === "student") return Student.findOne({ rut, isDeleted: { $ne: true } });
  if (role === "admin") return Admin.findOne({ rut });

  return null;
}

/** Lo que el servidor necesita de una ficha para abrir o validar una sesion. */
export type SessionProfile = {
  firstName: string;
  paternalLastName: string;
  avatarId: string;
  enabled: boolean;
};

const SESSION_FIELDS = "firstName paternalLastName avatarId enabled";

/**
 * Igual que findProfile pero solo con los campos de la sesion y sin armar el
 * documento de Mongoose. Para iniciar sesion y validar /auth/me, que se piden
 * muchas veces; findProfile completo se deja para quien necesita la ficha entera.
 */
export async function findSessionProfile(rut: string, role: string): Promise<SessionProfile | null> {
  if (role === "student") {
    return (await Student.findOne({ rut, isDeleted: { $ne: true } })
      .select(SESSION_FIELDS)
      .lean()) as SessionProfile | null;
  }

  if (role === "admin") {
    return (await Admin.findOne({ rut }).select(SESSION_FIELDS).lean()) as SessionProfile | null;
  }

  return null;
}
