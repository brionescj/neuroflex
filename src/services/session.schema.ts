import { z } from "zod";

import type { AvatarId } from "@/config/avatars";
import { AVATARS } from "@/config/avatars";
import { DASHBOARD_BY_ROLE } from "@/config/routes";
import type { UserRole } from "@/types";

const avatarIds = Object.keys(AVATARS) as AvatarId[];

const userRoles = Object.keys(DASHBOARD_BY_ROLE) as UserRole[];

/**
 * Valida lo que sale de localStorage antes de confiar en el cast a SessionUser.
 *
 * Una sesion guardada con una version anterior del tipo (por ejemplo sin
 * avatarId) no debe pasar como valida.
 */
export const SessionUserSchema = z.object({
  id: z.string().min(1),

  rut: z.string().min(1),

  role: z.enum(userRoles),

  displayName: z.string().min(1),

  avatarId: z.enum(avatarIds),
});
