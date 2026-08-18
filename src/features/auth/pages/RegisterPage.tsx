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
            <PasswordField
              id="register-password"
              label="Contrasena"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              message={fieldState.error?.message}
            />
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
