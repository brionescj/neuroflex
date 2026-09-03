import { Link, useLocation } from "react-router-dom";

import { ROLE_MENUS } from "@/config/menus";
import { DASHBOARD_BY_ROLE } from "@/config/routes";
import { useAuth } from "@/context";

export function Breadcrumb() {
  const { user } = useAuth();

  const location = useLocation();

  if (!user) {
    return null;
  }

  const root = DASHBOARD_BY_ROLE[user.role];

  const current = ROLE_MENUS[user.role].find(
    (item) => item.path === location.pathname
  );

  if (!current || current.path === root) {
    return null;
  }

  return (
    <p className="flex items-center gap-2 text-sm text-zinc-400">
      <Link to={root} className="hover:text-white">
        Inicio
      </Link>

      <span>/</span>

      <span className="text-white">{current.label}</span>
    </p>
  );
}