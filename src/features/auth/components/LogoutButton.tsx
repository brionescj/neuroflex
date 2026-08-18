import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/context";

export function LogoutButton() {
  const { logout } = useAuth();

  const navigate = useNavigate();

  function handleLogout() {
    logout();

    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <Button
      type="button"
      onClick={handleLogout}
      className="gap-2 bg-zinc-800 text-white hover:bg-zinc-700"
    >
      <LogOut className="size-4" />
      Cerrar sesion
    </Button>
  );
}
