import { z } from "zod";

/**
 * Unica fuente de verdad para validar el correo de contacto.
 *
 * La reusan profile.service.ts (revalidacion en el servidor) y el schema
 * del formulario de perfil, para que no existan dos reglas distintas.
 */
export const EmailSchema = z.string().min(1).email();
