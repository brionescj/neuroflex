import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Field, FieldError, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { AVATARS, type AvatarId } from "@/config/avatars";
import { useAuth } from "@/context";
import { cn } from "@/lib/utils";
import type { ProfileDetails } from "@/services/profile.service";

import { getProfileAction } from "../actions/getProfile.action";
import { updateProfileAction } from "../actions/updateProfile.action";
import {
  ProfileFormSchema,
  type ProfileFormInput,
} from "../schemas/profileForm.schema";

function readOnlyFields(details: ProfileDetails) {
  const base = [
    { label: "Nombres", value: details.firstName },
    { label: "Apellido paterno", value: details.paternalLastName },
    { label: "Apellido materno", value: details.maternalLastName },
  ];

  if (details.role === "student") {
    return [
      ...base,
      { label: "Carrera", value: "Educación Diferencial" },
      { label: "Año de ingreso", value: String(details.entryYear) },
    ];
  }

  if (details.role === "teacher") {
    return [...base, { label: "Título", value: details.title }];
  }

  return base;
}

export default function ProfilePage() {
  const { user, login } = useAuth();

  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: { email: "", avatarId: "cat" },
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    getProfileAction(user.rut, user.role).then((profile) => {
      if (!active || !profile) {
        return;
      }

      setDetails(profile);
      form.reset({ email: profile.email, avatarId: profile.avatarId });
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [user, form]);

  async function onSubmit(data: ProfileFormInput) {
    if (!user) {
      return;
    }

    const result = await updateProfileAction({
      rut: user.rut,
      role: user.role,
      email: data.email,
      avatarId: data.avatarId,
    });

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    // AuthContext no expone un metodo para refrescar la sesion activa
    // sin re-autenticar. Se reusa login() porque hoy es lo unico
    // disponible. Deuda tecnica: agregar updateUser() en AuthProvider.
    login({ ...user, avatarId: data.avatarId });

    toast.success(result.message);
  }

  if (!user || isLoading) {
    return <p className="text-zinc-400">Cargando perfil...</p>;
  }

  if (!details) {
    return (
      <p className="text-red-500">No se pudo cargar la ficha del perfil.</p>
    );
  }

  return (
    <div className="max-w-xl space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold text-white">Mi perfil</h1>
        <p className="text-[16px] text-zinc-400">
          Los datos institucionales no son editables. Puedes actualizar tu
          correo y tu avatar.
        </p>
      </div>

      <div className="space-y-2 rounded-xl border border-zinc-800 p-4">
        {readOnlyFields(details).map((field) => (
          <div key={field.label} className="flex justify-between text-sm">
            <span className="text-zinc-400">{field.label}</span>
            <span className="text-white">{field.value}</span>
          </div>
        ))}
      </div>

      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">Correo</FieldLabel>
              <Input
                id="email"
                type="email"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="avatarId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Avatar</FieldLabel>
              <div className="flex flex-wrap gap-3">
                {(
                  Object.entries(AVATARS) as [
                    AvatarId,
                    (typeof AVATARS)[AvatarId],
                  ][]
                ).map(([id, { icon: Icon, color }]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => field.onChange(id)}
                    className={cn(
                      "flex size-12 items-center justify-center rounded-full text-white transition",
                      color,
                      field.value === id
                        ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950"
                        : "opacity-60 hover:opacity-100",
                    )}
                  >
                    <Icon className="size-5" />
                  </button>
                ))}
              </div>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="h-13 bg-white text-black hover:bg-zinc-200"
        >
          {form.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </div>
  );
}