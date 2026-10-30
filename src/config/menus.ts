import {
  BarChart3,
  CircleUser,
  FileUp,
  Gamepad2,
  House,
  NotebookPen,
  Trophy,
  UserSearch,
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

    { label: "Juegos", path: ROUTES.STUDENT_GAMES, icon: Gamepad2 },

    { label: "Mis puntuaciones", path: ROUTES.STUDENT_SCORES, icon: Trophy },

    { label: "Mi perfil", path: ROUTES.STUDENT_PROFILE, icon: CircleUser },
  ],

  admin: [
    { label: "Inicio", path: ROUTES.ADMIN, icon: House },

    { label: "Carga de datos", path: ROUTES.ADMIN_DATA, icon: FileUp },

    { label: "Estadísticas", path: ROUTES.ADMIN_STATS, icon: BarChart3 },

    { label: "Desempeño", path: ROUTES.ADMIN_STUDENT_STATS, icon: UserSearch },

    { label: "Mini casos", path: ROUTES.ADMIN_MINI_CASES, icon: NotebookPen },

    { label: "Mi perfil", path: ROUTES.ADMIN_PROFILE, icon: CircleUser },
  ],
};
