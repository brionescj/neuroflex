import { Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { RutInput } from "@/components/forms/RutInput";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/Button";
import { Field, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { Teacher } from "@/types";
import { isValidRut } from "@/utils/rut";

import {
  createTeacherAction,
  listTeachersAction,
  setTeacherEnabledAction,
} from "../actions/teachers.action";
import { matchesQuery } from "../utils/matchesQuery";
import { sanitizeNameInput } from "../utils/sanitizeInput";
import { HighlightMatch } from "./HighlightMatch";
import { Pagination } from "./Pagination";

const EMPTY_FORM = {
  rut: "",
  firstName: "",
  paternalLastName: "",
  maternalLastName: "",
};

function TeacherToggle({
  teacher,
  onToggle,
}: {
  teacher: Teacher;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-28 rounded-lg bg-white px-3 py-1.5 text-center text-sm font-medium transition-colors",
        teacher.enabled
          ? "text-rose-600 hover:bg-rose-500/20"
          : "text-emerald-600 hover:bg-emerald-500/20",
      )}
    >
      {teacher.enabled ? "Inhabilitar" : "Habilitar"}
    </button>
  );
}

type TeachersSectionProps = {
  searchQuery: string;
  isActive: boolean;
};

export function TeachersSection({ searchQuery, isActive }: TeachersSectionProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(1);

  const isCardView = !useMediaQuery("(min-width: 1024px)");
  const pageSize = isCardView ? 5 : 12;

  const filteredTeachers = teachers.filter((t) => matchesQuery(t, searchQuery));

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
  const paginatedTeachers = filteredTeachers.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  async function loadTeachers() {
    setIsLoading(true);
    const result = await listTeachersAction();
    if (result.success) setTeachers(result.data);
    setIsLoading(false);
  }

  useEffect(() => {
    loadTeachers();
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

    const result = await createTeacherAction(form);

    setIsCreating(false);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    setForm(EMPTY_FORM);
    setShowForm(false);
    await loadTeachers();
  }

  useEffect(() => {
    if (!isActive) {
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    }
  }, [isActive]);

  function handleToggleForm() {
    if (showForm) {
      setForm(EMPTY_FORM);
      setFormError(null);
    }
    setShowForm((prev) => !prev);
  }

  async function handleToggle(teacher: Teacher) {
    await setTeacherEnabledAction(teacher.rut, !teacher.enabled);
    await loadTeachers();
  }

  const emptyMessage =
    teachers.length === 0
      ? "No hay docentes registrados."
      : "No hay docentes que coincidan con la busqueda.";

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={handleToggleForm}
        className="flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
      >
        <Plus className="size-4" />
        {showForm ? "Cancelar" : "Agregar docente"}
      </button>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid gap-4 rounded-2xl border border-zinc-800 p-4 sm:grid-cols-2"
        >
          <Field>
            <FieldLabel htmlFor="teacher-rut">RUT</FieldLabel>
            <RutInput
              id="teacher-rut"
              value={form.rut}
              onChange={(value) => setForm({ ...form, rut: value })}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="teacher-firstName">Nombres</FieldLabel>
            <Input
              id="teacher-firstName"
              value={form.firstName}
              onChange={(e) =>
                setForm({ ...form, firstName: sanitizeNameInput(e.target.value) })
              }
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="teacher-paternalLastName">
              Apellido paterno
            </FieldLabel>
            <Input
              id="teacher-paternalLastName"
              value={form.paternalLastName}
              onChange={(e) =>
                setForm({
                  ...form,
                  paternalLastName: sanitizeNameInput(e.target.value),
                })
              }
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="teacher-maternalLastName">
              Apellido materno
            </FieldLabel>
            <Input
              id="teacher-maternalLastName"
              value={form.maternalLastName}
              onChange={(e) =>
                setForm({
                  ...form,
                  maternalLastName: sanitizeNameInput(e.target.value),
                })
              }
              required
            />
          </Field>

          <div className="flex items-end sm:col-span-2">
            <Button
              type="submit"
              disabled={isCreating}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {isCreating ? "Creando..." : "Crear docente"}
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

          {!isLoading && filteredTeachers.length === 0 && (
            <p className="text-center text-zinc-500">{emptyMessage}</p>
          )}

          {!isLoading && filteredTeachers.length > 0 && (
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
                  {paginatedTeachers.map((teacher) => (
                    <tr
                      key={teacher.rut}
                      className="border-b border-zinc-800/50 last:border-0"
                    >
                      <td className="p-3">{teacher.rut}</td>
                      <td className="p-3">
                        <HighlightMatch
                          text={`${teacher.firstName} ${teacher.paternalLastName} ${teacher.maternalLastName}`}
                          query={searchQuery}
                        />
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            teacher.enabled ? "text-emerald-400" : "text-rose-400"
                          }
                        >
                          {teacher.enabled ? "Habilitado" : "Inhabilitado"}
                        </span>
                      </td>
                      <td className="p-3">
                        <TeacherToggle
                          teacher={teacher}
                          onToggle={() => handleToggle(teacher)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && filteredTeachers.length > 0 && (
            <div className="flex flex-col gap-3 lg:hidden">
              {paginatedTeachers.map((teacher) => (
                <div
                  key={teacher.rut}
                  className="rounded-2xl border border-zinc-800 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">
                        <HighlightMatch
                          text={`${teacher.firstName} ${teacher.paternalLastName} ${teacher.maternalLastName}`}
                          query={searchQuery}
                        />
                      </p>
                      <p className="text-xs text-zinc-500">{teacher.rut}</p>
                    </div>

                    <span
                      className={cn(
                        "text-xs font-medium",
                        teacher.enabled ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {teacher.enabled ? "Habilitado" : "Inhabilitado"}
                    </span>
                  </div>

                  <div className="mt-3">
                    <TeacherToggle
                      teacher={teacher}
                      onToggle={() => handleToggle(teacher)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}