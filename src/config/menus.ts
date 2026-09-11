import {
  BarChart3,
  CircleUser,
  ClipboardList,
  House,
  Trophy,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { UserRole } from "@/types";
import { ROUTES } from "./routes";

export type MenuItem = {
  label: string;

  path: string;

  icon: LucideIcon;
};

export const ROLE_MENUS: Record<UserRole, MenuItem[]> = {
  student: [
    { label: "Inicio", path: ROUTES.STUDENT, icon: House },

    { label: "Mis puntuaciones", path: ROUTES.STUDENT_SCORES, icon: Trophy },

    { label: "Mi perfil", path: ROUTES.STUDENT_PROFILE, icon: CircleUser },
  ],

  teacher: [
    { label: "Inicio", path: ROUTES.TEACHER, icon: House },

    { label: "Estudiantes", path: ROUTES.TEACHER_STUDENTS, icon: Users },

    { label: "Reportes", path: ROUTES.TEACHER_REPORTS, icon: ClipboardList },

    { label: "Mi perfil", path: ROUTES.TEACHER_PROFILE, icon: CircleUser },
  ],

  admin: [
    { label: "Inicio", path: ROUTES.ADMIN, icon: House },

    { label: "Estadísticas", path: ROUTES.ADMIN_STUDENTS, icon: BarChart3 },

    { label: "Mi perfil", path: ROUTES.ADMIN_PROFILE, icon: CircleUser },
  ],
};
