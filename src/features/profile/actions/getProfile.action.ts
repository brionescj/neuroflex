import { getProfileDetails } from "@/services/profile.service";
import type { UserRole } from "@/types";

export async function getProfileAction(rut: string, role: UserRole) {
  return getProfileDetails(rut, role);
}