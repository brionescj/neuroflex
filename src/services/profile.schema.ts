import { z } from "zod";

import { emailProblem, normalizeEmail } from "@/utils/email";

/**
 * Validacion del correo de contacto en el formulario de perfil. La regla (y
 * sus mensajes) vive en src/utils/email.ts y es la misma que aplica el servidor.
 */
export const EmailSchema = z.string().superRefine((value, ctx) => {
  const problem = emailProblem(normalizeEmail(value));

  if (problem) ctx.addIssue({ code: "custom", message: problem });
});
