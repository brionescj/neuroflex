import { z } from "zod";

export const LoginSchema = z.object({
  rut: z
    .string()
    .min(1, "Ingrese su RUT.")
    .refine(
      (rut) => {
        const clean = rut.replace(/\./g, "").replace(/\s/g, "");

        return /^\d+-[\dkK]$/.test(clean);
      },
      {
        message: "Ingrese un RUT válido.",
      },
    ),

  password: z
    .string()
    .min(6, "La contraseña debe contener al menos 6 caracteres."),
});

export type Login = z.infer<typeof LoginSchema>;