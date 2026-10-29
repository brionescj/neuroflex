/**
 * Datos de la página de presentación del proyecto («Inicio» del estudiante). Son texto fijo:
 * no los edita nadie desde la plataforma.
 *
 * Las fotos del equipo son archivos de la carpeta `public/equipo/`. Para cargarlas basta con dejar ahí
 * un archivo con el nombre indicado en `photoName` y extensión .jpg, .jpeg, .png o .webp (se prueba
 * en ese orden). Mientras no exista, el círculo muestra las iniciales.
 */
export const PROJECT_TITLE =
  "Estrategias de Innovación y APP Móvil: Fortaleciendo las Funciones Ejecutivas que se encuentran a la base de la Comprensión Lectora en IES (Instituciones de educación superior).";

export const PROJECT_SUBTITLE =
  "Un modelo comparativo basado en Neurociencias para la optimización de la formación superior en modalidad online y presencial en dos contextos regionales";

export const PROJECT_FUND = "FONDO INTERNO DE INVESTIGACIÓN (FII) 2026";

export type TeamMember = {
  name: string;
  role: string;
  /** Nombre del archivo en public/equipo/, sin extensión. */
  photoName: string;
};

export const TEAM: readonly TeamMember[] = [
  {
    name: "Madelaine Mora Rojas",
    role: "Directora e investigadora responsable del proyecto",
    photoName: "madelaine-mora-rojas",
  },
  {
    name: "Arturo Pinto Guevara",
    role: "Coinvestigador",
    photoName: "arturo-pinto-guevara",
  },
];

export const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export const DEVELOPER = {
  name: "Camilo Briones Quezada",
  role: "Ingeniero Consultor y Desarrollador de aplicaciones Web",
  phone: "+56 9 7410 3834",
  phoneLink: "tel:+56974103834",
};
