import { z } from "zod";

export const SignInSchema = z.object({
  email: z.email("Ingrese un email válido."),
  password: z
    .string()
    .min(6, "La contraseña debe contener al menos 6 caracteres."),
});

export type SignIn = z.infer<typeof SignInSchema>;