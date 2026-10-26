import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Field, FieldError, FieldLabel } from "@/components/ui/Field";
import { EmailInput } from "@/components/forms/EmailInput";
import { AVATARS, type AvatarId } from "@/config/avatars";
import { universityLabel } from "@/config/studentOptions";
import { useAuth } from "@/context";
import { updateAdminNamesAction } from "@/features/admin/actions/admins.action";
import { AdminNameForm, type PersonNames } from "@/features/admin/components/AdminNameForm";
import { formatBirthDate } from "@/features/admin/utils/birthDate";
import { ChangePasswordForm } from "@/features/auth/components";
import { cn } from "@/lib/utils";
import type { ProfileDetails } from "@/services/profile.service";

import { getProfileAction } from "../actions/getProfile.action";
import { updateProfileAction } from "../actions/updateProfile.action";
import {
  ProfileFormSchema,
  type ProfileFormInput,
} from "../schemas/profileForm.schema";

/**
 * Lo que el estudiante no edita desde el perfil, ordenado como en las tarjetas de
 * estudiantes del panel de administracion en el celular. (Los nombres de un
 * administrador los puede corregir: van aparte.)
 */
function studentFields(details: Extract<ProfileDetails, { role: "student" }>) {
  return [
    { label: "RUT", value: details.rut },
    { label: "Universidad", value: universityLabel(details.university) },
    { label: "Fecha de nacimiento", value: formatBirthDate(details.birthDate) },
    { label: "Ciudad", value: details.ciudad },
    { label: "Región", value: details.region },
    {
      label: "Celular",
      value: details.celular ? `+569 ${details.celular}` : undefined,
    },
  ];
}

export default function ProfilePage() {
  const { user, login } = useAuth();

  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingData, setIsEditingData] = useState(false);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: { email: "", avatarId: "cat" },
  });

  // Solo depende de QUIEN es, no del objeto de sesion: `login()` lo reemplaza al guardar el nombre o el
  // avatar, y recargar la ficha ahi pisaria con una copia vieja lo que se acaba de guardar.
  const rut = user?.rut;
  const role = user?.role;

  useEffect(() => {
    if (!rut || !role) {
      return;
    }

    let active = true;

    getProfileAction(rut, role).then((profile) => {
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
  }, [rut, role, form]);

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

    // La ficha en pantalla pasa a ser la guardada: "Cancelar" vuelve a ESTE correo, no al anterior.
    setDetails((current) =>
      current ? { ...current, email: data.email, avatarId: data.avatarId } : current,
    );
    setIsEditingEmail(false);
    toast.success(result.message);
  }

  /** Descarta lo escrito en el correo y vuelve al ultimo guardado. */
  function cancelEmailEdit() {
    form.resetField("email", { defaultValue: details?.email ?? "" });
    setIsEditingEmail(false);
  }

  /**
   * Los datos del administrador (nombres y correo) se guardan juntos desde su tarjeta. El avatar es
   * aparte, con «Guardar cambios». Si los nombres se guardan y el correo no, se dice cual quedo sin guardar.
   */
  async function saveAdminData(names: PersonNames, email: string): Promise<string | null> {
    if (!user || details?.role !== "admin") return null;

    const namesChanged =
      names.firstName !== details.firstName ||
      names.paternalLastName !== details.paternalLastName ||
      names.maternalLastName !== details.maternalLastName;
    const emailChanged = email !== details.email;

    if (namesChanged) {
      const result = await updateAdminNamesAction(user.rut, names);

      if (!result.success) return result.message;

      // El saludo de la sesion se arma con el nombre: se actualiza junto con la ficha.
      login({ ...user, displayName: `${result.data.firstName} ${result.data.paternalLastName}` });
      setDetails((current) => (current ? { ...current, ...names } : current));
    }

    if (emailChanged) {
      // Se guarda el avatar que ya estaba guardado, no uno elegido abajo y sin guardar todavia.
      const result = await updateProfileAction({ rut: user.rut, role: user.role, email, avatarId: details.avatarId });

      if (!result.success) {
        return namesChanged ? `Los nombres se guardaron, pero el correo no: ${result.message}` : result.message;
      }

      form.resetField("email", { defaultValue: email });
      setDetails((current) => (current ? { ...current, email } : current));
    }

    setIsEditingData(false);
    toast.success(namesChanged || emailChanged ? "Datos actualizados." : "No había cambios que guardar.");

    return null;
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
          {details.role === "admin"
            ? "Puedes actualizar tu nombre, tu correo, tu avatar y tu contraseña."
            : "Los datos institucionales no son editables. Puedes actualizar tu correo, tu avatar y tu contraseña."}
        </p>
      </div>

      {details.role === "admin" && (
        <div className="rounded-2xl border border-zinc-800 p-4">
          {isEditingData ? (
            <AdminNameForm
              idPrefix="profile"
              initial={details}
              email={details.email}
              onSubmit={saveAdminData}
              onCancel={() => setIsEditingData(false)}
              stacked
            />
          ) : (
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-white">
                {details.firstName} {details.paternalLastName} {details.maternalLastName}
              </p>

              <button
                type="button"
                onClick={() => setIsEditingData(true)}
                title="Editar datos"
                aria-label="Editar datos"
                className="-my-1 shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <Pencil className="size-4" />
              </button>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-4 border-t border-zinc-800 pt-3 min-[420px]:grid-cols-2">
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">RUT</p>
              <p className="break-words text-sm text-white">{details.rut}</p>
            </div>

            {!isEditingData && (
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Correo</p>
                <p className="break-words text-sm text-white">{details.email || "Sin registrar"}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {details.role === "student" && (
        <div className="rounded-2xl border border-zinc-800 p-4">
          <p className="font-medium text-white">
            {details.firstName} {details.paternalLastName}{" "}
            {details.maternalLastName}
          </p>

          <div className="mt-1 flex gap-4 text-xs text-zinc-400">
            <span>Paralelo {details.paralelo}</span>
            <span>Ingreso {details.entryYear}</span>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-4 border-t border-zinc-800 pt-3 min-[420px]:grid-cols-2">
            {studentFields(details).map((field) => (
              <div key={field.label} className="min-w-0">
                <p className="text-xs text-zinc-500">{field.label}</p>
                <p className="break-words text-sm text-white">
                  {field.value || "Sin registrar"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        {details.role === "student" && (
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="email">Correo</FieldLabel>

                  {!isEditingEmail && (
                    <button
                      type="button"
                      onClick={() => setIsEditingEmail(true)}
                      title="Editar correo"
                      className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                    >
                      <Pencil className="size-4" />
                    </button>
                  )}
                </div>

                {isEditingEmail ? (
                  <div className="space-y-2">
                    <EmailInput
                      id="email"
                      autoComplete="email"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      autoFocus
                    />

                    <button
                      type="button"
                      onClick={cancelEmailEdit}
                      className="min-h-11 rounded-lg px-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                    >
                      Cancelar cambio de correo
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-white">{field.value || "Sin registrar"}</p>
                )}

                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )}

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

        {details.role === "admin" && form.formState.errors.email && (
          <p role="alert" className="text-sm text-rose-400">
            Para guardar el avatar, primero registra un correo válido con el lápiz de tu tarjeta.
          </p>
        )}

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="h-13 bg-white text-black hover:bg-zinc-200"
        >
          {form.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>

      <ChangePasswordForm />
    </div>
  );
}