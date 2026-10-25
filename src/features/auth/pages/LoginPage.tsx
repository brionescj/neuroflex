import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";

import { RutInput } from "@/components/forms/RutInput";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/Field";
import { DASHBOARD_BY_ROLE, ROUTES } from "@/config/routes";
import { useAuth } from "@/context";
import { takeSessionNotice } from "@/lib/sessionNotice";

import { loginAction } from "../actions/login.action";
import { PasswordField } from "../components";
import { LoginSchema, type LoginInput } from "../schemas/login.schema";

export default function LoginPage() {
  const navigate = useNavigate();

  const { login } = useAuth();

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),

    defaultValues: {
      rut: "",
      password: "",
    },
  });

  // Si la sesion se cerro porque la cuenta entro desde otro dispositivo, se explica aqui.
  useEffect(() => {
    const notice = takeSessionNotice();

    if (notice) toast.info(notice, { duration: 8000 });
  }, []);

  async function onSubmit(data: LoginInput) {
    const result = await loginAction(data);

    if (!result.success) {
      toast.error(result.message);

      return;
    }

    login(result.data);

    toast.success(`Bienvenido ${result.data.displayName}`);

    navigate(DASHBOARD_BY_ROLE[result.data.role], { replace: true });
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold text-white">
          Bienvenido de nuevo
        </h1>

        <p className="text-[16px] text-zinc-400">
          Ingresa tu RUT y contrasena para continuar.
        </p>
      </div>

      <form
        id="login-form"
        className="space-y-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Controller
          control={form.control}
          name="rut"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="rut" className="text-white">
                RUT
              </FieldLabel>

              <RutInput
                id="rut"
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
              id="password"
              label="Contrasena"
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
            ? "Ingresando..."
            : "Iniciar sesion"}
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-400">
        No tienes cuenta?{" "}
        <Link
          to={ROUTES.REGISTER}
          className="font-semibold text-white underline"
        >
          Crear cuenta
        </Link>
      </p>
    </>
  );
}
