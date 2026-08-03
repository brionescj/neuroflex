import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Field, FieldError, FieldLabel } from "@/components/ui/Field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/InputGroup";

import {
  SignInSchema,
  type SignIn,
} from "../../schemas/login.schema";

import { LoginHeader } from "./LoginHeader";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignIn>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: SignIn) {
    console.log(data);

    toast.success("Formulario válido.");
  }

  return (
    <div className="flex w-full flex-col gap-8">

      <LoginHeader />

      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field>

              <FieldLabel>
                Correo electrónico
              </FieldLabel>

              <InputGroup>

                <InputGroupInput
                  {...field}
                  placeholder="tu@correo.com"
                />

              </InputGroup>

              <FieldError
                errors={[fieldState.error]}
              />

            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field>

              <FieldLabel>
                Contraseña
              </FieldLabel>

              <InputGroup>

                <InputGroupInput
                  {...field}
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                />

                <InputGroupAddon>

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((v) => !v)
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>

                </InputGroupAddon>

              </InputGroup>

              <FieldError
                errors={[fieldState.error]}
              />

            </Field>
          )}
        />

        <Button
          className="mt-2 h-14 w-full text-base"
          type="submit"
        >
          Iniciar sesión
        </Button>

      </form>
    </div>
  );
}