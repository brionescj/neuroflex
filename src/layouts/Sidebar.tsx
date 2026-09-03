import { X } from "lucide-react";
import { NavLink } from "react-router-dom";

import { ROLE_MENUS } from "@/config/menus";
import { DASHBOARD_BY_ROLE } from "@/config/routes";
import { useAuth } from "@/context";
import { cn } from "@/lib/utils";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const items = ROLE_MENUS[user.role];
  const root = DASHBOARD_BY_ROLE[user.role];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col gap-1 border-r border-zinc-800 bg-zinc-950 p-4 transition-transform duration-200 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between px-2">
          <span className="text-lg font-bold text-white">NeuroFlex</span>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white md:hidden"
            aria-label="Cerrar menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === root}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white",
                )
              }
            >
              <Icon className="size-4" />
              {item.label}
            </NavLink>
          );
        })}
      </aside>
    </>
  );
}