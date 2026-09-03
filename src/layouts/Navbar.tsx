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
    <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="text-zinc-400 hover:text-white md:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>

        <Avatar avatarId={user.avatarId} size="sm" />

        <span className="text-sm font-semibold text-white">
          {user.displayName}
        </span>
      </div>

      <LogoutButton />
    </header>
  );
}