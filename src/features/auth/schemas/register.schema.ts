import { z } from "zod";

import { isValidRut } from "@/utils/rut";

export const RegisterSchema = z
  .object({
    rut: z
      .string()
      .min(1, "Ingrese su RUT.")
      .refine(isValidRut, "El RUT ingresado no es valido."),

    password: z
      .string()
      .min(8, "La contrasena debe contener al menos 8 caracteres."),

    confirmPassword: z.string().min(1, "Repita la contrasena."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;
