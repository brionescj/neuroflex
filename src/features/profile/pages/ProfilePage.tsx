import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Field, FieldError, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { EmailInput } from "@/components/forms/EmailInput";
import { RegionCommuneFields } from "@/components/forms/RegionCommuneFields";
import { AVATARS, type AvatarId } from "@/config/avatars";
import { GENDER_OPTIONS, STUDY_SHIFT_OPTIONS, genderLabel, studyShiftLabel, universityLabel } from "@/config/studentOptions";
import { useAuth } from "@/context";
import { updateAdminNamesAction } from "@/features/admin/actions/admins.action";
import { AdminNameForm, type PersonNames } from "@/features/admin/components/AdminNameForm";
import { birthDateRange, formatBirthDate, toInputDate } from "@/features/admin/utils/birthDate";
import { ChangePasswordForm } from "@/features/auth/components";
import { cn } from "@/lib/utils";
import { placeForSelects } from "@/utils/commune";
import type { ProfileDetails } from "@/services/profile.service";
import type { Gender, StudyShift } from "@/types";

import { getProfileAction } from "../actions/getProfile.action";
import { updateProfileAction } from "../actions/updateProfile.action";
import {
  ProfileFormSchema,
  type ProfileFormInput,
} from "../schemas/profileForm.schema";

type StudentDetails = Extract<ProfileDetails, { role: "student" }>;

/**
 * Lo que el estudiante no edita desde el perfil, ordenado como en las tarjetas de
 * estudiantes del panel de administracion en el celular. (Los nombres de un
 * administrador los puede corregir: van aparte. El correo, la fecha de nacimiento,
 * la jornada, la region y la comuna del estudiante se editan juntos con el lapiz de su tarjeta.)
 */
function institutionalFields(details: StudentDetails) {
  return [
    { label: "RUT", value: details.rut },
    { label: "Universidad", value: universityLabel(details.university) },
    {
      label: "Celular",
      value: details.celular ? `+569 ${details.celular}` : undefined,
    },
  ];
}

/**
 * Los datos que el estudiante edita con el lápiz, tal como están guardados. La región y la comuna se llevan
 * a su nombre oficial; si la ficha trae una que la lista no reconoce, queda en «Seleccionar» (no se inventa
 * ni se da una por defecto).
 */
function contactValues(details: ProfileDetails) {
  return details.role === "student"
    ? {
        email: details.email ?? "",
        birthDate: toInputDate(details.birthDate),
        studyShift: (details.studyShift ?? "") as StudyShift | "",
        gender: (details.gender ?? "") as Gender | "",
        ...placeForSelects(details.region, details.comuna),
      }
    : { email: details.email ?? "", birthDate: "", studyShift: "" as const, gender: "" as const, region: "", comuna: "" };
}

const SELECT_CLASS =
  "h-12 w-full rounded-xl border border-zinc-700 bg-transparent px-4 text-white outline-none transition focus:border-white";

export default function ProfilePage() {
  const { user, login } = useAuth();

  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEditingData, setIsEditingData] = useState(false);

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: { email: "", avatarId: "cat", birthDate: "", studyShift: "", gender: "", region: "", comuna: "" },
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
      form.reset({ ...contactValues(profile), avatarId: profile.avatarId });
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [rut, role, form]);

  async function onSubmit(data: ProfileFormInput) {
    if (!user || !details) {
      return;
    }

    const isStudent = details.role === "student";
    const saved = contactValues(details);

    // La fecha, la jornada, la region y la comuna solo viajan si cambiaron: un dato antiguo que el selector no
    // entiende se ve vacio, y mandarlo vacio lo borraria sin querer al guardar otro dato.
    const regionChanged = data.region !== saved.region;
    const result = await updateProfileAction({
      rut: user.rut,
      role: user.role,
      email: data.email,
      avatarId: data.avatarId,
      ...(isStudent && data.birthDate !== saved.birthDate && { birthDate: data.birthDate }),
      ...(isStudent && data.studyShift !== saved.studyShift && { studyShift: data.studyShift }),
      ...(isStudent && data.gender !== saved.gender && { gender: data.gender }),
      ...(isStudent && regionChanged && { region: data.region }),
      // Al cambiar de region se manda la comuna aunque quede vacia: la anterior ya no es de esa region.
      ...(isStudent && (regionChanged || data.comuna !== saved.comuna) && { comuna: data.comuna }),
    });

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    // AuthContext no expone un metodo para refrescar la sesion activa
    // sin re-autenticar. Se reusa login() porque hoy es lo unico
    // disponible. Deuda tecnica: agregar updateUser() en AuthProvider.
    login({ ...user, avatarId: data.avatarId });

    // La ficha en pantalla pasa a ser la guardada: «Cancelar» vuelve a ESTOS datos, no a los anteriores.
    const stored = result.data;
    const next = {
      ...details,
      email: data.email,
      avatarId: data.avatarId,
      ...(isStudent && {
        birthDate: stored.birthDate,
        studyShift: stored.studyShift,
        gender: stored.gender,
        region: stored.region,
        comuna: stored.comuna,
      }),
    } as ProfileDetails;

    setDetails(next);
    form.reset({ ...contactValues(next), avatarId: data.avatarId });
    setIsEditingContact(false);
    toast.success(result.message);
  }

  /** Descarta lo escrito en el lapiz (correo, fecha, jornada, genero, region y comuna) y vuelve a lo ultimo guardado. */
  function cancelContactEdit() {
    if (details) {
      const saved = contactValues(details);

      form.resetField("email", { defaultValue: saved.email });
      form.resetField("birthDate", { defaultValue: saved.birthDate });
      form.resetField("studyShift", { defaultValue: saved.studyShift });
      form.resetField("gender", { defaultValue: saved.gender });
      form.resetField("region", { defaultValue: saved.region });
      form.resetField("comuna", { defaultValue: saved.comuna });
    }

    setIsEditingContact(false);
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

  const range = birthDateRange();

  return (
    <div className="max-w-xl space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-bold text-white">Mi perfil</h1>
        <p className="text-[16px] text-zinc-400">
          {details.role === "admin"
            ? "Puedes actualizar tu nombre, tu correo, tu avatar y tu contraseña."
            : "Los datos institucionales no son editables. Puedes actualizar tu correo, tu fecha de nacimiento, tu jornada, tu región, tu comuna, tu avatar y tu contraseña."}
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

      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        {details.role === "student" && (
          <div className="rounded-2xl border border-zinc-800 p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-white">
                {details.firstName} {details.paternalLastName}{" "}
                {details.maternalLastName}
              </p>

              {!isEditingContact && (
                <button
                  type="button"
                  onClick={() => setIsEditingContact(true)}
                  title="Editar correo, fecha de nacimiento, jornada, género, región y comuna"
                  aria-label="Editar correo, fecha de nacimiento, jornada, género, región y comuna"
                  className="-my-1 shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Pencil className="size-4" />
                </button>
              )}
            </div>

            <div className="mt-1 flex gap-4 text-xs text-zinc-400">
              <span>Paralelo {details.paralelo}</span>
              <span>Ingreso {details.entryYear}</span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 border-t border-zinc-800 pt-3 min-[420px]:grid-cols-2">
              {institutionalFields(details).map((field) => (
                <div key={field.label} className="min-w-0">
                  <p className="text-xs text-zinc-500">{field.label}</p>
                  <p className="break-words text-sm text-white">
                    {field.value || "Sin registrar"}
                  </p>
                </div>
              ))}

              {isEditingContact ? (
                <>
                  <Controller
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="min-[420px]:col-span-2">
                        <FieldLabel htmlFor="email">Correo</FieldLabel>
                        <EmailInput
                          id="email"
                          autoComplete="email"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          aria-invalid={fieldState.invalid}
                          autoFocus
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="birthDate"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="birthDate">Fecha de nacimiento</FieldLabel>
                        <Input
                          id="birthDate"
                          type="date"
                          className="scheme-dark"
                          min={range.min}
                          max={range.max}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          aria-invalid={fieldState.invalid}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="studyShift"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="studyShift">Jornada</FieldLabel>
                        <select
                          id="studyShift"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          className={SELECT_CLASS}
                        >
                          <option value="" disabled={field.value !== ""} className="bg-zinc-900">
                            Seleccionar
                          </option>
                          {STUDY_SHIFT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} className="bg-zinc-900">
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="gender"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="gender">Género</FieldLabel>
                        <select
                          id="gender"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          className={SELECT_CLASS}
                        >
                          <option value="" disabled={field.value !== ""} className="bg-zinc-900">
                            Seleccionar
                          </option>
                          {GENDER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} className="bg-zinc-900">
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="region"
                    render={({ field: regionField }) => (
                      <Controller
                        control={form.control}
                        name="comuna"
                        render={({ field: communeField, fieldState }) => (
                          <>
                            <RegionCommuneFields
                              idPrefix="profile"
                              region={regionField.value}
                              comuna={communeField.value}
                              onChange={(place) => {
                                regionField.onChange(place.region);
                                communeField.onChange(place.comuna);
                              }}
                              selectClassName={`${SELECT_CLASS} disabled:opacity-50`}
                              optionClassName="bg-zinc-900"
                            />

                            {fieldState.error && (
                              <div className="min-[420px]:col-span-2">
                                <FieldError errors={[fieldState.error]} />
                              </div>
                            )}
                          </>
                        )}
                      />
                    )}
                  />

                  <div className="min-[420px]:col-span-2">
                    <button
                      type="button"
                      onClick={cancelContactEdit}
                      className="min-h-11 rounded-lg px-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                    >
                      Cancelar cambios
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="min-w-0 min-[420px]:col-span-2">
                    <p className="text-xs text-zinc-500">Correo</p>
                    <p className="break-words text-sm text-white">{details.email || "Sin registrar"}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">Fecha de nacimiento</p>
                    <p className="break-words text-sm text-white">
                      {formatBirthDate(details.birthDate) || "Sin registrar"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">Jornada</p>
                    <p className="break-words text-sm text-white">
                      {studyShiftLabel(details.studyShift) || "Sin registrar"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">Género</p>
                    <p className="break-words text-sm text-white">{genderLabel(details.gender) || "Sin registrar"}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">Región</p>
                    <p className="break-words text-sm text-white">{details.region || "Sin registrar"}</p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">Comuna</p>
                    <p className="break-words text-sm text-white">{details.comuna || "Sin registrar"}</p>
                  </div>
                </>
              )}
            </div>
          </div>
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
