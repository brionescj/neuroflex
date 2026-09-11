import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { RutInput } from "@/components/forms/RutInput";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/Field";
import { ROUTES } from "@/config/routes";

import { registerAction } from "../actions/register.action";
import { PasswordField } from "../components";
import {
  RegisterSchema,
  type RegisterInput,
} from "../schemas/register.schema";


import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const PASSWORD_RULES = [
  { label: "Al menos 8 caracteres", test: (v: string) => v.length >= 8 },
  {
    label: "Letras y numeros",
    test: (v: string) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v),
  },
  { label: "Al menos una mayuscula", test: (v: string) => /[A-Z]/.test(v) },
  {
    label: "Al menos un caracter especial",
    test: (v: string) => /[^a-zA-Z0-9]/.test(v),
  },
  {
    label: "Sin digitos repetidos seguidos",
    test: (v: string) => v.length === 0 || !/(\d)\1/.test(v),
  },
];

function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="space-y-1 pt-1 text-xs">
      {PASSWORD_RULES.map((rule) => {
        const valid = rule.test(password);

        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-1.5",
              valid ? "text-emerald-400" : "text-zinc-500",
            )}
          >
            <Check className="size-3" />
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),

    defaultValues: {
      rut: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: RegisterInput) {
    const result = await registerAction({
      rut: data.rut,
      password: data.password,
    });

    if (!result.success) {
      toast.error(result.message);

      return;
    }

    toast.success("Cuenta creada. Ya puedes iniciar sesion.");

    navigate(ROUTES.LOGIN, { replace: true });
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold text-white">
          Crear cuenta
        </h1>

        <p className="text-[16px] text-zinc-400">
          Solo pueden registrarse estudiantes cargados por la
          universidad.
        </p>
      </div>

      <form
        id="register-form"
        className="space-y-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Controller
          control={form.control}
          name="rut"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-rut" className="text-white">
                RUT
              </FieldLabel>

              <RutInput
                id="register-rut"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
                className="h-13 border border-zinc-700 text-white"
              />

              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <div className="space-y-1">
              <PasswordField
                id="register-password"
                label="Contrasena"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                message={fieldState.error?.message}
              />

              <PasswordRules password={field.value} />
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <PasswordField
              id="register-confirm-password"
              label="Repetir contrasena"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              message={fieldState.error?.message}
            />
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="mt-4 h-15 w-full bg-white text-[16px] font-semibold text-black hover:bg-zinc-200"
        >
          {form.formState.isSubmitting
            ? "Creando cuenta..."
            : "Crear cuenta"}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-400">
        Ya tienes cuenta?{" "}
        <Link
          to={ROUTES.LOGIN}
          className="font-semibold text-white underline"
        >
          Iniciar sesion
        </Link>
      </p>
    </>
  );
}
