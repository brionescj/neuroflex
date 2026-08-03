import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context";
import { Button } from "@/components/ui/Button";
import { Field, FieldError, FieldLabel } from "@/components/ui/Field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/InputGroup";

import { RutInput } from "@/components/forms/RutInput";

import { loginAction } from "../actions/login.action";
import {
  LoginSchema,
  type Login,
} from "../schemas/login.schema";

export default function LoginPage() {
  const navigate = useNavigate();

const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<Login>({
    resolver: zodResolver(LoginSchema),

    defaultValues: {
      rut: "",
      password: "",
    },
  });

  async function onSubmit(data: Login) {
  const result = await loginAction(data);

  if (!result.success || !result.data) {
    toast.error(result.message);

    return;
  }

  login(result.data);

  toast.success(`Bienvenido ${result.data.name}`);

  switch (result.data.role) {
    case "admin":
      navigate("/admin");
      break;

    case "teacher":
      navigate("/teacher");
      break;

    default:
      navigate("/student");
      break;
  }
}

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold text-white">
          Bienvenido de nuevo
        </h1>

        <p className="text-[16px] text-zinc-400">
          Ingresa tu RUT y contraseña para continuar.
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
              <FieldLabel
                htmlFor="rut"
                className="text-white"
              >
                RUT
              </FieldLabel>

              <RutInput
                id="rut"
                value={field.value}
                onChange={field.onChange}
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
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel
                htmlFor="password"
                className="text-white"
              >
                Contraseña
              </FieldLabel>

              <InputGroup className="h-13 border border-zinc-700 text-white">
                <InputGroupInput
                  {...field}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  autoComplete="off"
                />

                <InputGroupAddon
                  className="cursor-pointer"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </InputGroupAddon>
              </InputGroup>

              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Button
          form="login-form"
          type="submit"
          className="mt-4 h-15 w-full bg-white text-[16px] font-semibold text-black hover:bg-zinc-200"
        >
          Iniciar sesión
        </Button>
      </form>
    </>
  );
}