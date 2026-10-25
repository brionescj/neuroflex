import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";

import { changePasswordAction } from "../actions/changePassword.action";
import {
  ChangePasswordSchema,
  type ChangePasswordInput,
} from "../schemas/changePassword.schema";
import { PasswordField } from "./PasswordField";
import { PasswordRules } from "./PasswordRules";

const EMPTY: ChangePasswordInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

/**
 * Cambio de la propia contraseña, para estudiantes y administradores. Pide la
 * actual y aplica las mismas reglas del registro. Parte cerrado: es algo que se
 * hace de vez en cuando.
 */
export function ChangePasswordForm() {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: EMPTY,
  });

  function close() {
    form.reset(EMPTY);
    setIsOpen(false);
  }

  async function onSubmit(data: ChangePasswordInput) {
    const result = await changePasswordAction({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    if (!result.success) {
      toast.error(result.message);

      return;
    }

    toast.success(result.message);
    close();
  }

  return (
    <section className="space-y-4 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-white">Contraseña</h2>
          <p className="text-sm text-zinc-400">
            Cámbiala cuando quieras; necesitas escribir la actual.
          </p>
        </div>

        {!isOpen && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="shrink-0 gap-2"
          >
            <KeyRound className="size-4" />
            Cambiar
          </Button>
        )}
      </div>

      {isOpen && (
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Controller
            control={form.control}
            name="currentPassword"
            render={({ field, fieldState }) => (
              <PasswordField
                id="current-password"
                label="Contraseña actual"
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
            name="newPassword"
            render={({ field, fieldState }) => (
              <div className="space-y-1">
                <PasswordField
                  id="new-password"
                  label="Contraseña nueva"
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
                id="confirm-new-password"
                label="Repetir contraseña nueva"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                message={fieldState.error?.message}
              />
            )}
          />

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="h-13 bg-white text-black hover:bg-zinc-200"
            >
              {form.formState.isSubmitting ? "Guardando..." : "Guardar contraseña"}
            </Button>

            <Button type="button" variant="outline" onClick={close} className="h-13">
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
