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
      .min(8, "La contrasena debe tener al menos 8 caracteres.")
      .refine(
        (v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v),
        "Debe ser alfanumerica (letras y numeros).",
      )
      .refine((v) => /[A-Z]/.test(v), "Debe incluir al menos una mayuscula.")
      .refine(
        (v) => /[^a-zA-Z0-9]/.test(v),
        "Debe incluir al menos un caracter especial.",
      )
      .refine(
        (v) => !/(\d)\1/.test(v),
        "No puede repetir un mismo digito de forma consecutiva.",
      ),

    confirmPassword: z.string().min(1, "Repita la contrasena."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;