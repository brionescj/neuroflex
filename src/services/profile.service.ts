import {
  adminRepository,
  studentRepository,
  teacherRepository,
} from "@/repositories";
import type { AvatarId } from "@/config/avatars";
import type { UserRole } from "@/types";

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
