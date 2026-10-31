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

export const PROJECT_OBJECTIVE =
  "Optimizar el desarrollo de las Funciones Ejecutivas (planificación, flexibilidad cognitiva, autocontrol y memoria de trabajo) como base fundamental para la comprensión lectora, mediante un modelo comparativo que integra estrategias de innovación y el uso de una APP móvil basada en fundamento de las neurociencias, analizando su transferencia en estudiantes de Educación Diferencial en modalidades online y presencial de la Universidad Viña del Mar de la V Región y Universidad Santo Tomás de la Región metropolitana.";

export const PROJECT_FUND = "FONDO INTERNO DE INVESTIGACIÓN (FII) 2026";

export type TeamMember = {
  name: string;
  role: string;
  /** Nombre del archivo en public/equipo/, sin extensión. */
  photoName: string;
  /**
   * Cuál parte de la foto se ve dentro del círculo (CSS `object-position`: «x% y%», 50% 50% = centro).
   * Subir el primer valor corre la imagen hacia la izquierda; bajar el segundo la corre hacia abajo.
   * Solo tiene efecto si la foto no es cuadrada.
   */
  photoPosition: string;
};

export const TEAM: readonly TeamMember[] = [
  {
    name: "Madelaine Mora Rojas",
    role: "Directora e investigadora responsable del proyecto",
    photoName: "madelaine-mora-rojas",
    photoPosition: "95% 50%",
  },
  {
    name: "Arturo Pinto Guevara",
    role: "Coinvestigador",
    photoName: "arturo-pinto-guevara",
    photoPosition: "50% 5%",
  },
];

export const PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export const DEVELOPER = {
  name: "Camilo Briones Quezada",
  role: "Ingeniero Consultor y Desarrollador de aplicaciones Web",
  phone: "+56 9 7410 3834",
  phoneLink: "tel:+56974103834",
};
