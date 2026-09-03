import {
  adminRepository,
  studentRepository,
  teacherRepository,
} from "@/repositories";
import type { AvatarId } from "@/config/avatars";
import {
  fail,
  ok,
  type Admin,
  type ApiResponse,
  type Student,
  type Teacher,
  type UserRole,
} from "@/types";
import { EmailSchema } from "./profile.schema";

type Profile = {
  firstName: string;

  paternalLastName: string;

  enabled: boolean;

  avatarId: AvatarId;
};

/**
 * AuthUser no guarda nombres.
 *
 * Este servicio resuelve la ficha academica segun el rol.
 */
export async function findProfile(
  rut: string,
  role: UserRole,
): Promise<Profile | null> {
  if (role === "student") {
    return studentRepository.findByRut(rut);
  }

  if (role === "teacher") {
    return teacherRepository.findByRut(rut);
  }

  return adminRepository.findByRut(rut);
}

export function buildDisplayName(profile: Profile): string {
  return `${profile.firstName} ${profile.paternalLastName}`;
}

/**
 * Ficha completa para la pagina de perfil (union discriminada por role,
 * para acceder sin castear a los campos que solo tiene un rol:
 * entryYear/entrySemester en Student, title en Teacher).
 */
export type ProfileDetails =
  | ({ role: "student" } & Student)
  | ({ role: "teacher" } & Teacher)
  | ({ role: "admin" } & Admin);

export async function getProfileDetails(
  rut: string,
  role: UserRole,
): Promise<ProfileDetails | null> {
  if (role === "student") {
    const student = await studentRepository.findByRut(rut);

    return student ? { role: "student", ...student } : null;
  }

  if (role === "teacher") {
    const teacher = await teacherRepository.findByRut(rut);

    return teacher ? { role: "teacher", ...teacher } : null;
  }

  const admin = await adminRepository.findByRut(rut);

  return admin ? { role: "admin", ...admin } : null;
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

/**
 * El servicio no confia en que el formulario ya valido el correo:
 * lo revalida aqui, igual que cualquier otro dato que llega desde la UI.
 */
export async function updateProfileContact(
  payload: UpdateContactPayload,
): Promise<ApiResponse<ContactData>> {
  const { rut, role, email, avatarId } = payload;

  if (!EmailSchema.safeParse(email).success) {
    return fail("Correo invalido.");
  }

  const contact: ContactData = { email, avatarId };

  const updated =
    role === "student"
      ? await studentRepository.updateContact(rut, contact)
      : role === "teacher"
        ? await teacherRepository.updateContact(rut, contact)
        : await adminRepository.updateContact(rut, contact);

  if (!updated) {
    return fail("No se pudo actualizar el perfil.");
  }

  return ok(contact, "Perfil actualizado.");
}
