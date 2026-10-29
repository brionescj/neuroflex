import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import { ROUTES } from "@/config/routes";

export function BackToGameHub() {
  return (
    <Link
      to={ROUTES.STUDENT_GAMES}
      className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-zinc-400 transition-colors hover:text-white"
    >
      <ArrowLeft className="size-4" />
      Volver a la sala de juegos
    </Link>
  );
}
