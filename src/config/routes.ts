import type { UserRole } from "@/types";

export const ROUTES = {
  LOGIN: "/",

  REGISTER: "/registro",

  STUDENT: "/estudiante",

  /** Menú con los tres juegos. «Inicio» (STUDENT) es la página de presentación del proyecto. */
  STUDENT_GAMES: "/estudiante/juegos",

  STUDENT_GAME_COLOR_SEQUENCE: "/estudiante/juegos/seriacion-de-colores",

  STUDENT_GAME_MINI_CASES: "/estudiante/juegos/mini-casos",

  STUDENT_GAME_NODE_CONNECTION: "/estudiante/juegos/conexion-de-nodos",

  STUDENT_SCORES: "/estudiante/puntuaciones",

  STUDENT_PROFILE: "/estudiante/perfil",

  /** Inicio del administrador: la misma presentación del proyecto que ve el estudiante. */
  ADMIN: "/administracion",

  /** Estudiantes, datos incompletos, administradores y carga masiva (lo que antes era el «Inicio» del admin). */
  ADMIN_DATA: "/administracion/carga-de-datos",

  ADMIN_STATS: "/administracion/estadisticas",

  ADMIN_STUDENT_STATS: "/administracion/desempeno",

  ADMIN_MINI_CASES: "/administracion/mini-casos",

  ADMIN_PROFILE: "/administracion/perfil",
} as const;

export const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  student: ROUTES.STUDENT,

  admin: ROUTES.ADMIN,
};
