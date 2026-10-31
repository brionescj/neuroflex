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
import { GENDER_OPTIONS, STUDY_SHIFT_OPTIONS, genderLabel, studyShiftLabel, universityLabel } from "@/config/studentOptions";
import { useAuth } from "@/context";
import { updateAdminNamesAction } from "@/features/admin/actions/admins.action";
import { AdminNameForm, type PersonNames } from "@/features/admin/components/AdminNameForm";
import { birthDateRange, formatBirthDate, toInputDate } from "@/features/admin/utils/birthDate";
import { ChangePasswordForm } from "@/features/auth/components";
import { emailProblem, normalizeEmail } from "@/utils/email";
import { placeForSelects } from "@/utils/commune";
import type { ProfileDetails } from "@/services/profile.service";
import type { Gender, StudyShift } from "@/types";

import { getProfileAction } from "../actions/getProfile.action";
import { AvatarPicker } from "../components/AvatarPicker";
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
    // El administrador guarda desde el formulario de su tarjeta (saveAdminData), no desde este.
    if (!user || !details || details.role !== "student") {
      return;
    }

    const saved = contactValues(details);

    // La fecha, la jornada, la region y la comuna solo viajan si cambiaron: un dato antiguo que el selector no
    // entiende se ve vacio, y mandarlo vacio lo borraria sin querer al guardar otro dato.
    const regionChanged = data.region !== saved.region;
    const result = await updateProfileAction({
      rut: user.rut,
      role: user.role,
      email: data.email,
      avatarId: data.avatarId,
      ...(data.birthDate !== saved.birthDate && { birthDate: data.birthDate }),
      ...(data.studyShift !== saved.studyShift && { studyShift: data.studyShift }),
      ...(data.gender !== saved.gender && { gender: data.gender }),
      ...(regionChanged && { region: data.region }),
      // Al cambiar de region se manda la comuna aunque quede vacia: la anterior ya no es de esa region.
      ...((regionChanged || data.comuna !== saved.comuna) && { comuna: data.comuna }),
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
      birthDate: stored.birthDate,
      studyShift: stored.studyShift,
      gender: stored.gender,
      region: stored.region,
      comuna: stored.comuna,
    } as ProfileDetails;

    setDetails(next);
    form.reset({ ...contactValues(next), avatarId: data.avatarId });
    setIsEditingContact(false);
    toast.success(result.message);
  }

  /** Descarta lo escrito en el lapiz (correo, fecha, jornada, genero, region, comuna y avatar) y vuelve a lo ultimo guardado. */
  function cancelContactEdit() {
    if (details) {
      const saved = contactValues(details);

      form.resetField("email", { defaultValue: saved.email });
      form.resetField("birthDate", { defaultValue: saved.birthDate });
      form.resetField("studyShift", { defaultValue: saved.studyShift });
      form.resetField("gender", { defaultValue: saved.gender });
      form.resetField("region", { defaultValue: saved.region });
      form.resetField("comuna", { defaultValue: saved.comuna });
      form.resetField("avatarId", { defaultValue: details.avatarId });
    }

    setIsEditingContact(false);
  }

  /**
   * Los datos del administrador (nombres, correo y avatar) se guardan juntos desde su tarjeta. Si los nombres
   * se guardan y lo demas no, se dice que quedo sin guardar.
   */
  async function saveAdminData(names: PersonNames, email: string): Promise<string | null> {
    if (!user || details?.role !== "admin") return null;

    const avatarId = form.getValues("avatarId");
    const namesChanged =
      names.firstName !== details.firstName ||
      names.paternalLastName !== details.paternalLastName ||
      names.maternalLastName !== details.maternalLastName;
    const emailChanged = email !== details.email;
    const avatarChanged = avatarId !== details.avatarId;

    // El avatar se guarda junto con el correo: sin un correo valido no hay con que guardarlo.
    if (avatarChanged && emailProblem(normalizeEmail(email))) {
      return "Para guardar el avatar, primero registra un correo válido.";
    }

    // La sesion se va actualizando con lo que se guardo, para no pisar un cambio con una copia vieja.
    let session = user;

    if (namesChanged) {
      const result = await updateAdminNamesAction(user.rut, names);

      if (!result.success) return result.message;

      // El saludo de la sesion se arma con el nombre: se actualiza junto con la ficha.
      session = { ...session, displayName: `${result.data.firstName} ${result.data.paternalLastName}` };
      login(session);
      setDetails((current) => (current ? { ...current, ...names } : current));
    }

    if (emailChanged || avatarChanged) {
      const result = await updateProfileAction({ rut: user.rut, role: user.role, email, avatarId });

      if (!result.success) {
        return namesChanged ? `Los nombres se guardaron, pero lo demás no: ${result.message}` : result.message;
      }

      login({ ...session, avatarId });
      form.resetField("avatarId", { defaultValue: avatarId });
      setDetails((current) => (current ? { ...current, email, avatarId } : current));
    }

    setIsEditingData(false);
    toast.success(namesChanged || emailChanged || avatarChanged ? "Datos actualizados." : "No había cambios que guardar.");

    return null;
  }

  /** Descarta lo editado en la tarjeta del administrador, incluido el avatar elegido y sin guardar. */
  function cancelAdminEdit() {
    if (details) form.resetField("avatarId", { defaultValue: details.avatarId });

    setIsEditingData(false);
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
            ? "Con el lápiz de tu tarjeta puedes actualizar tu nombre, tu correo y tu avatar. También puedes cambiar tu contraseña."
            : "Los datos institucionales no son editables. Con el lápiz de tu tarjeta puedes actualizar tu correo, tu fecha de nacimiento, tu jornada, tu género, tu región, tu comuna y tu avatar. También puedes cambiar tu contraseña."}
        </p>
      </div>

      {details.role === "admin" && (
        <div className="rounded-2xl border border-zinc-800 p-4">
          <div className="flex items-start gap-3">
            <Controller
              control={form.control}
              name="avatarId"
              render={({ field }) => (
                <AvatarPicker value={field.value} onChange={field.onChange} editing={isEditingData} />
              )}
            />

            <div className="min-w-0 flex-1 pt-1">
              <p className="font-medium text-white">
                {details.firstName} {details.paternalLastName} {details.maternalLastName}
              </p>

              {isEditingData && <p className="mt-1 text-xs text-zinc-500">Toca tu avatar para elegir otro.</p>}
            </div>

            {!isEditingData && (
              <button
                type="button"
                onClick={() => setIsEditingData(true)}
                title="Editar nombre, correo y avatar"
                aria-label="Editar nombre, correo y avatar"
                className="shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <Pencil className="size-4" />
              </button>
            )}
          </div>

          {isEditingData && (
            <div className="mt-4">
              <AdminNameForm
                idPrefix="profile"
                initial={details}
                email={details.email}
                onSubmit={saveAdminData}
                onCancel={cancelAdminEdit}
                submitLabel="Guardar cambios"
                cancelLabel="Cancelar cambios"
                stacked
              />
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
            <div className="flex items-start gap-3">
              <Controller
                control={form.control}
                name="avatarId"
                render={({ field }) => (
                  <AvatarPicker value={field.value} onChange={field.onChange} editing={isEditingContact} />
                )}
              />

              <div className="min-w-0 flex-1 pt-1">
                <p className="font-medium text-white">
                  {details.firstName} {details.paternalLastName} {details.maternalLastName}
                </p>

                <div className="mt-1 flex gap-4 text-xs text-zinc-400">
                  <span>Paralelo {details.paralelo}</span>
                  <span>Ingreso {details.entryYear}</span>
                </div>

                {isEditingContact && <p className="mt-1 text-xs text-zinc-500">Toca tu avatar para elegir otro.</p>}
              </div>

              {!isEditingContact && (
                <button
                  type="button"
                  onClick={() => setIsEditingContact(true)}
                  title="Editar correo, fecha de nacimiento, jornada, género, región, comuna y avatar"
                  aria-label="Editar correo, fecha de nacimiento, jornada, género, región, comuna y avatar"
                  className="shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Pencil className="size-4" />
                </button>
              )}
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

                  <div className="flex flex-wrap items-center gap-2 min-[420px]:col-span-2">
                    <Button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="h-11 bg-white px-4 text-sm text-black hover:bg-zinc-200"
                    >
                      {form.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
                    </Button>

                    <button
                      type="button"
                      onClick={cancelContactEdit}
                      className="min-h-11 rounded-lg px-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
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
      </form>

      <ChangePasswordForm />
    </div>
  );
}
