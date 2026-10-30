import { ProjectHome } from "@/components/project";
import { ROUTES } from "@/config/routes";

/** «Inicio» del administrador: la misma presentación del proyecto que ve el estudiante, con un botón a la carga de datos. */
export default function AdminHomePage() {
  return <ProjectHome action={{ label: "Ir a la carga de datos", to: ROUTES.ADMIN_DATA }} />;
}
