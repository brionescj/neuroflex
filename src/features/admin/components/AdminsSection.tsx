import { Dices, KeyRound, Pencil, Plus } from "lucide-react";
import { Fragment, useEffect, useState, type FormEvent } from "react";

import { RutInput } from "@/components/forms/RutInput";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/Button";
import { Field, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/features/auth/components";
import { useAuth } from "@/context";
import { cn } from "@/lib/utils";
import type { Admin } from "@/types";
import { generatePassword } from "@/utils/password";
import { isValidRut } from "@/utils/rut";

import {
  createAdminAction,
  generateAdminPasswordAction,
  listAdminsAction,
  setAdminEnabledAction,
  updateAdminNamesAction,
} from "../actions/admins.action";
import { matchesQuery } from "../utils/matchesQuery";
import { formatNameInput } from "../utils/sanitizeInput";
import { AdminNameForm, type PersonNames } from "./AdminNameForm";
import { GeneratePasswordDialog } from "./GeneratePasswordDialog";
import { HighlightMatch } from "./HighlightMatch";
import { Pagination } from "./Pagination";

const EMPTY_FORM = {
  rut: "",
  firstName: "",
  paternalLastName: "",
  maternalLastName: "",
  password: "",
};

function AdminToggle({
  admin,
  isSelf,
  onToggle,
}: {
  admin: Admin;
  /** Es la cuenta con la que se inició sesión: el servidor no deja inhabilitarla. */
  isSelf: boolean;
  onToggle: () => void;
}) {
  if (isSelf) {
    return <span className="inline-block w-28 text-center text-xs text-zinc-500">Tu cuenta</span>;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-28 rounded-lg bg-white px-3 py-1.5 text-center text-sm font-medium transition-colors",
        admin.enabled
          ? "text-rose-600 hover:bg-rose-500/20"
          : "text-emerald-600 hover:bg-emerald-500/20",
      )}
    >
      {admin.enabled ? "Inhabilitar" : "Habilitar"}
    </button>
  );
}

function AdminActions({
  admin,
  isSelf,
  isEditing,
  onToggle,
  onEdit,
  onPassword,
}: {
  admin: Admin;
  isSelf: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onPassword: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <AdminToggle admin={admin} isSelf={isSelf} onToggle={onToggle} />

      {/* La propia contraseña se cambia desde el perfil; aqui solo la de otro administrador. */}
      {!isSelf && (
        <button
          type="button"
          onClick={onPassword}
          title="Generar nueva contraseña"
          aria-label="Generar nueva contraseña"
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <KeyRound className="size-4" />
        </button>
      )}

      {!isEditing && (
        <button
          type="button"
          onClick={onEdit}
          title="Modificar nombre"
          aria-label="Modificar nombre"
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <Pencil className="size-4" />
        </button>
      )}
    </div>
  );
}

type AdminsSectionProps = {
  searchQuery: string;
  isActive: boolean;
};

// Ultimo listado recibido (ver StudentsSection): se muestra al instante y se actualiza detras.
let lastAdmins: Admin[] | null = null;

export function AdminsSection({ searchQuery, isActive }: AdminsSectionProps) {
  const { user, login } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>(() => lastAdmins ?? []);
  const [isLoading, setIsLoading] = useState(lastAdmins === null);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [editingRut, setEditingRut] = useState<string | null>(null);
  const [passwordFor, setPasswordFor] = useState<Admin | null>(null);

  const isCardView = !useMediaQuery("(min-width: 1024px)");
  const pageSize = isCardView ? 5 : 12;

  const filteredAdmins = admins.filter((t) => matchesQuery(t, searchQuery));

  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
  const paginatedAdmins = filteredAdmins.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  async function loadAdmins() {
    if (lastAdmins === null) setIsLoading(true);
    const result = await listAdminsAction();
    if (result.success) {
      lastAdmins = result.data;
      setAdmins(result.data);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!isValidRut(form.rut)) {
      setFormError("El RUT ingresado no es valido.");
      return;
    }

    setIsCreating(true);

    const result = await createAdminAction(form);

    setIsCreating(false);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    setForm(EMPTY_FORM);
    setPasswordVisible(false);
    setShowForm(false);
    await loadAdmins();
  }

  useEffect(() => {
    if (!isActive) {
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFormError(null);
      setPasswordVisible(false);
      setEditingRut(null);
      setPasswordFor(null);
    }
  }, [isActive]);

  function handleToggleForm() {
    if (showForm) {
      setForm(EMPTY_FORM);
      setFormError(null);
      setPasswordVisible(false);
    }
    setShowForm((prev) => !prev);
  }

  function handleGeneratePassword() {
    setForm((current) => ({ ...current, password: generatePassword() }));
    // Se deja a la vista: quien la crea tiene que poder leerla y entregarla.
    setPasswordVisible(true);
  }

  async function handleSaveNames(admin: Admin, names: PersonNames): Promise<string | null> {
    const result = await updateAdminNamesAction(admin.rut, names);

    if (!result.success) return result.message;

    // Si el administrador se corrigio su propio nombre, el saludo de la sesion tambien cambia.
    if (user && admin.rut === user.rut) {
      login({ ...user, displayName: `${result.data.firstName} ${result.data.paternalLastName}` });
    }

    setEditingRut(null);
    await loadAdmins();

    return null;
  }

  async function handleToggle(admin: Admin) {
    await setAdminEnabledAction(admin.rut, !admin.enabled);
    await loadAdmins();
  }

  const emptyMessage =
    admins.length === 0
      ? "No hay administradores registrados."
      : "No hay administradores que coincidan con la busqueda.";

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={handleToggleForm}
        className="flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
      >
        <Plus className="size-4" />
        {showForm ? "Cancelar" : "Agregar administrador"}
      </button>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-800 p-4 sm:grid-cols-2"
        >
          <Field>
            <FieldLabel htmlFor="admin-rut">RUT</FieldLabel>
            <RutInput
              id="admin-rut"
              value={form.rut}
              onChange={(value) => setForm({ ...form, rut: value })}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="admin-firstName">Nombres</FieldLabel>
            <Input
              id="admin-firstName"
              value={form.firstName}
              onChange={(e) =>
                setForm({ ...form, firstName: formatNameInput(e.target.value) })
              }
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="admin-paternalLastName">
              Apellido paterno
            </FieldLabel>
            <Input
              id="admin-paternalLastName"
              value={form.paternalLastName}
              onChange={(e) =>
                setForm({
                  ...form,
                  paternalLastName: formatNameInput(e.target.value),
                })
              }
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="admin-maternalLastName">
              Apellido materno
            </FieldLabel>
            <Input
              id="admin-maternalLastName"
              value={form.maternalLastName}
              onChange={(e) =>
                setForm({
                  ...form,
                  maternalLastName: formatNameInput(e.target.value),
                })
              }
              required
            />
          </Field>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="admin-password">Contraseña inicial</FieldLabel>
            <div className="flex min-w-0 gap-2">
              <PasswordInput
                id="admin-password"
                autoComplete="new-password"
                value={form.password}
                onChange={(password) => setForm({ ...form, password })}
                visible={passwordVisible}
                onVisibleChange={setPasswordVisible}
                copyable
                required
              />

              <Button
                type="button"
                variant="outline"
                onClick={handleGeneratePassword}
                className="shrink-0 gap-2 px-4"
              >
                <Dices className="size-4" />
                Generar
              </Button>
            </div>
            <p className="text-xs text-zinc-500">
              Mínimo 8 caracteres, con letras y números, una mayúscula y un
              carácter especial. Entréguesela a la persona: es con la que
              iniciará sesión.
            </p>
          </Field>

          <div className="flex items-end sm:col-span-2">
            <Button
              type="submit"
              disabled={isCreating}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {isCreating ? "Creando..." : "Crear administrador"}
            </Button>
          </div>

          {formError && (
            <p className="text-sm text-rose-400 sm:col-span-2">{formError}</p>
          )}
        </form>
      )}

      {!showForm && (
        <>
          {isLoading && <p className="text-center text-zinc-500">Cargando...</p>}

          {!isLoading && filteredAdmins.length === 0 && (
            <p className="text-center text-zinc-500">{emptyMessage}</p>
          )}

          {!isLoading && filteredAdmins.length > 0 && (
            <div className="hidden overflow-x-auto rounded-2xl border border-zinc-800 lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="p-3 font-normal">RUT</th>
                    <th className="p-3 font-normal">Nombre</th>
                    <th className="p-3 font-normal">Estado</th>
                    <th className="p-3 font-normal" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedAdmins.map((admin) => (
                    <Fragment key={admin.rut}>
                      <tr className="border-b border-zinc-800/50 last:border-0">
                        <td className="p-3">{admin.rut}</td>
                        <td className="p-3">
                          <HighlightMatch
                            text={`${admin.firstName} ${admin.paternalLastName} ${admin.maternalLastName}`}
                            query={searchQuery}
                          />
                        </td>
                        <td className="p-3">
                          <span
                            className={
                              admin.enabled ? "text-emerald-400" : "text-rose-400"
                            }
                          >
                            {admin.enabled ? "Habilitado" : "Inhabilitado"}
                          </span>
                        </td>
                        <td className="p-3">
                          <AdminActions
                            admin={admin}
                            isSelf={admin.rut === user?.rut}
                            isEditing={editingRut === admin.rut}
                            onToggle={() => handleToggle(admin)}
                            onEdit={() => setEditingRut(admin.rut)}
                            onPassword={() => setPasswordFor(admin)}
                          />
                        </td>
                      </tr>

                      {editingRut === admin.rut && (
                        <tr className="border-b border-zinc-800/50 bg-zinc-900/50">
                          <td colSpan={4} className="p-3">
                            <AdminNameForm
                              idPrefix={`edit-admin-${admin.rut}`}
                              initial={admin}
                              onSubmit={(names) => handleSaveNames(admin, names)}
                              onCancel={() => setEditingRut(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && filteredAdmins.length > 0 && (
            <div className="flex flex-col gap-3 lg:hidden">
              {paginatedAdmins.map((admin) => (
                <div
                  key={admin.rut}
                  className="rounded-2xl border border-zinc-800 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">
                        <HighlightMatch
                          text={`${admin.firstName} ${admin.paternalLastName} ${admin.maternalLastName}`}
                          query={searchQuery}
                        />
                      </p>
                      <p className="text-xs text-zinc-500">{admin.rut}</p>
                    </div>

                    <span
                      className={cn(
                        "text-xs font-medium",
                        admin.enabled ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {admin.enabled ? "Habilitado" : "Inhabilitado"}
                    </span>
                  </div>

                  <div className="mt-3">
                    <AdminActions
                      admin={admin}
                      isSelf={admin.rut === user?.rut}
                      isEditing={editingRut === admin.rut}
                      onToggle={() => handleToggle(admin)}
                      onEdit={() => setEditingRut(admin.rut)}
                      onPassword={() => setPasswordFor(admin)}
                    />
                  </div>

                  {editingRut === admin.rut && (
                    <div className="mt-3 border-t border-zinc-800 pt-3">
                      <AdminNameForm
                        idPrefix={`edit-admin-card-${admin.rut}`}
                        initial={admin}
                        onSubmit={(names) => handleSaveNames(admin, names)}
                        onCancel={() => setEditingRut(null)}
                        stacked
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      {passwordFor && (
        <GeneratePasswordDialog
          target={{
            rut: passwordFor.rut,
            fullName: `${passwordFor.firstName} ${passwordFor.paternalLastName} ${passwordFor.maternalLastName}`,
            kind: "admin",
          }}
          generate={(adminPassword) => generateAdminPasswordAction(passwordFor.rut, adminPassword)}
          onClose={() => setPasswordFor(null)}
          onGenerated={() => undefined}
        />
      )}
    </div>
  );
}