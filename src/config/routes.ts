import type { UserRole } from "@/types";

export const ROUTES = {
  LOGIN: "/",

  REGISTER: "/registro",

  STUDENT: "/estudiante",

  STUDENT_GAME_COLOR_SEQUENCE: "/estudiante/juegos/seriacion-de-colores",

  STUDENT_GAME_MINI_CASES: "/estudiante/juegos/mini-casos",

  STUDENT_GAME_NODE_CONNECTION: "/estudiante/juegos/conexion-de-nodos",

  STUDENT_SCORES: "/estudiante/puntuaciones",

  STUDENT_PROFILE: "/estudiante/perfil",

  TEACHER: "/docente",

  TEACHER_STUDENTS: "/docente/estudiantes",

  TEACHER_REPORTS: "/docente/reportes",

  TEACHER_PROFILE: "/docente/perfil",

  ADMIN: "/administracion",

  ADMIN_STATS: "/administracion/estadisticas",

  ADMIN_PROFILE: "/administracion/perfil",
} as const;

export const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  student: ROUTES.STUDENT,

  teacher: ROUTES.TEACHER,

  admin: ROUTES.ADMIN,
};
