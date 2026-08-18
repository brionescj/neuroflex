import { z } from "zod";

import { isValidRut } from "@/utils/rut";

export const LoginSchema = z.object({
  rut: z
    .string()
    .min(1, "Ingrese su RUT.")
    .refine(isValidRut, "El RUT ingresado no es valido."),

  password: z
    .string()
    .min(6, "La contrasena debe contener al menos 6 caracteres."),
});

export type LoginInput = z.infer<typeof LoginSchema>;
