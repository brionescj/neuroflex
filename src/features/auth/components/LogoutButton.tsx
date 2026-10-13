import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { useAuth, useGameLock } from "@/context";

export function LogoutButton() {
  const { logout } = useAuth();
  const { isLocked } = useGameLock();

  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <Button
      type="button"
      onClick={handleLogout}
      disabled={isLocked}
      title={isLocked ? "Termina la partida para cerrar sesion" : undefined}
      className="gap-2 bg-zinc-800 text-white hover:bg-zinc-700"
    >
      <LogOut className="size-4" />
      Cerrar sesion
    </Button>
  );
}
