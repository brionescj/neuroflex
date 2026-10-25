import { Menu } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context";
import { LogoutButton } from "@/features/auth/components";

type NavbarProps = {
  onMenuClick: () => void;
};

export function Navbar({ onMenuClick }: NavbarProps) {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3 sm:px-6 sm:py-4">
      {/* min-w-0: el nombre se acorta con "..." en vez de empujar el boton. */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 text-zinc-400 hover:text-white md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>

        <Avatar avatarId={user.avatarId} size="sm" className="shrink-0" />

        <span className="min-w-0 truncate text-sm font-semibold text-white">
          {user.displayName}
        </span>
      </div>

      <LogoutButton />
    </header>
  );
}