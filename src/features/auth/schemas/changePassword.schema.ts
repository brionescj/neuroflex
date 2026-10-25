import { z } from "zod";

import { passwordProblem } from "@/utils/password";

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingrese su contraseña actual."),

    newPassword: z.string().superRefine((value, ctx) => {
      const problem = passwordProblem(value);

      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),

    confirmPassword: z.string().min(1, "Repita la nueva contraseña."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "La nueva contraseña debe ser distinta de la actual.",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
