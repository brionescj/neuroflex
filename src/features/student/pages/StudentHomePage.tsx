import { ProjectHome } from "@/components/project";
import { ROUTES } from "@/config/routes";

/** «Inicio» del estudiante: la presentación del proyecto, con un botón a los juegos. */
export default function StudentHomePage() {
  return <ProjectHome action={{ label: "Ir a los juegos", to: ROUTES.STUDENT_GAMES }} />;
}
