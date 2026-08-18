import type { UserRole } from "@/types";

export const ROUTES = {
  LOGIN: "/",

  REGISTER: "/registro",

  STUDENT: "/estudiante",

  TEACHER: "/docente",

  ADMIN: "/administracion",
} as const;

export const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  student: ROUTES.STUDENT,

  teacher: ROUTES.TEACHER,

  admin: ROUTES.ADMIN,
};
