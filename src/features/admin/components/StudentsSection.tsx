import { Eye, KeyRound, Pencil, Plus, Save } from "lucide-react";
import { Fragment, useEffect, useState, type FormEvent } from "react";

import { EmailInput } from "@/components/forms/EmailInput";
import { RegionCommuneFields } from "@/components/forms/RegionCommuneFields";
import { RutInput } from "@/components/forms/RutInput";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/Button";
import { Field, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  GENDER_OPTIONS,
  PARALELO_OPTIONS,
  STUDY_SHIFT_OPTIONS,
  UNIVERSITY_OPTIONS,
  genderLabel,
  studyShiftLabel,
  universityLabel,
} from "@/config/studentOptions";
import { cn } from "@/lib/utils";
import type { Gender, Paralelo, Student, StudyShift, University } from "@/types";
import { optionalEmailProblem } from "@/utils/email";
import { placeForSelects } from "@/utils/commune";
import { isValidRut } from "@/utils/rut";

import {
  createStudentAction,
  generateStudentPasswordAction,
  listStudentsAction,
  setStudentEnabledAction,
  updateStudentDetailsAction,
} from "../actions/students.action";
import { birthDateRange, formatBirthDate, toInputDate } from "../utils/birthDate";
import { matchesQuery } from "../utils/matchesQuery";
import { formatNameInput } from "../utils/sanitizeInput";
import { DEFAULT_SORT, ageOf, isOlder, nextSort, sortStudents, type SortKey, type SortState } from "../utils/studentTable";
import { HighlightMatch } from "./HighlightMatch";
import { Pagination } from "./Pagination";
import { GeneratePasswordDialog } from "./GeneratePasswordDialog";
import { SortableHeader } from "./SortableHeader";
import { StudentSortBar } from "./StudentSortBar";

const EMPTY_FORM = {
  rut: "",
  firstName: "",
  paternalLastName: "",
  maternalLastName: "",
  paralelo: "",
  comuna: "",
  region: "",
  celular: "",
  email: "",
  gender: "" as Gender | "",
  university: "" as University | "",
  studyShift: "" as StudyShift | "",
  birthDate: "",
};

type EditFormState = {
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  email: string;
  comuna: string;
  region: string;
  celular: string;
  gender: Gender | "";
  university: University | "";
  studyShift: StudyShift | "";
  /** AAAA-MM-DD, como lo entrega <input type="date">. */
  birthDate: string;
};

const EMPTY_EDIT_FORM: EditFormState = {
  firstName: "",
  paternalLastName: "",
  maternalLastName: "",
  email: "",
  comuna: "",
  region: "",
  celular: "",
  gender: "",
  university: "",
  studyShift: "",
  birthDate: "",
};

const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none transition focus:border-white disabled:opacity-50";

type StudentEditFormProps = {
  editForm: EditFormState;
  setEditForm: (form: EditFormState) => void;
  editError: string | null;
  studentRut: string;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  stacked?: boolean;
};

function StudentEditForm({
  editForm,
  setEditForm,
  editError,
  studentRut,
  onSubmit,
  onCancel,
  stacked,
}: StudentEditFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn("gap-3", stacked ? "flex flex-col" : "grid sm:grid-cols-3")}
    >
      <Field>
        <FieldLabel htmlFor={`edit-firstName-${studentRut}`}>Nombres</FieldLabel>
        <Input
          id={`edit-firstName-${studentRut}`}
          className="h-10"
          value={editForm.firstName}
          onChange={(e) =>
            setEditForm({ ...editForm, firstName: formatNameInput(e.target.value) })
          }
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`edit-paternalLastName-${studentRut}`}>Apellido paterno</FieldLabel>
        <Input
          id={`edit-paternalLastName-${studentRut}`}
          className="h-10"
          value={editForm.paternalLastName}
          onChange={(e) =>
            setEditForm({ ...editForm, paternalLastName: formatNameInput(e.target.value) })
          }
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`edit-maternalLastName-${studentRut}`}>Apellido materno</FieldLabel>
        <Input
          id={`edit-maternalLastName-${studentRut}`}
          className="h-10"
          value={editForm.maternalLastName}
          onChange={(e) =>
            setEditForm({ ...editForm, maternalLastName: formatNameInput(e.target.value) })
          }
          required
        />
      </Field>

      <Field className="sm:col-span-3">
        <FieldLabel htmlFor={`edit-email-${studentRut}`}>Correo</FieldLabel>
        <EmailInput
          id={`edit-email-${studentRut}`}
          className="h-10"
          value={editForm.email}
          onChange={(email) => setEditForm({ ...editForm, email })}
        />
      </Field>

      <RegionCommuneFields
        idPrefix={`edit-${studentRut}`}
        region={editForm.region}
        comuna={editForm.comuna}
        onChange={(place) => setEditForm({ ...editForm, ...place })}
        selectClassName={SELECT_CLASS}
        allowClear
      />

      <Field>
        <FieldLabel htmlFor={`edit-celular-${studentRut}`}>Celular</FieldLabel>
        <div className="flex h-10 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3">
          <span className="text-sm text-zinc-500">+569</span>
          <input
            id={`edit-celular-${studentRut}`}
            type="text"
            inputMode="numeric"
            value={editForm.celular}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 8);
              setEditForm({ ...editForm, celular: digitsOnly });
            }}
            placeholder="12345678"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
          />
        </div>
      </Field>

      <Field>
        <FieldLabel htmlFor={`edit-gender-${studentRut}`}>Género</FieldLabel>
        <select
          id={`edit-gender-${studentRut}`}
          className={SELECT_CLASS}
          value={editForm.gender}
          onChange={(e) =>
            setEditForm({ ...editForm, gender: e.target.value as Gender | "" })
          }
        >
          <option value="">Sin registrar</option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field>
        <FieldLabel htmlFor={`edit-university-${studentRut}`}>Universidad</FieldLabel>
        <select
          id={`edit-university-${studentRut}`}
          className={SELECT_CLASS}
          value={editForm.university}
          onChange={(e) =>
            setEditForm({ ...editForm, university: e.target.value as University | "" })
          }
        >
          <option value="">Sin registrar</option>
          {UNIVERSITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field>
        <FieldLabel htmlFor={`edit-studyShift-${studentRut}`}>Jornada</FieldLabel>
        <select
          id={`edit-studyShift-${studentRut}`}
          className={SELECT_CLASS}
          value={editForm.studyShift}
          onChange={(e) =>
            setEditForm({ ...editForm, studyShift: e.target.value as StudyShift | "" })
          }
        >
          <option value="">Sin registrar</option>
          {STUDY_SHIFT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>

      <Field>
        <FieldLabel htmlFor={`edit-birthDate-${studentRut}`}>
          Fecha de nacimiento
        </FieldLabel>
        <Input
          id={`edit-birthDate-${studentRut}`}
          type="date"
          className="h-10 scheme-dark"
          min={birthDateRange().min}
          max={birthDateRange().max}
          value={editForm.birthDate}
          onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
        />
      </Field>

      {editError && (
        <p className="text-sm text-rose-400 sm:col-span-3">{editError}</p>
      )}

      <div className={cn("flex items-center gap-3", !stacked && "self-end")}>
        <button
          type="submit"
          title="Guardar"
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-black transition-colors hover:bg-zinc-200"
        >
          <Save className="size-4" />
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="flex h-10 items-center justify-center rounded-lg bg-zinc-700 px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-600"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function StudentDetailsView({
  student,
  stacked,
}: {
  student: Student;
  stacked?: boolean;
}) {
  const fields = [
    { label: "Correo", value: student.email },
    { label: "Región", value: student.region },
    { label: "Comuna", value: student.comuna },
    {
      label: "Celular",
      value: student.celular ? `+569 ${student.celular}` : undefined,
    },
    { label: "Género", value: genderLabel(student.gender) },
    { label: "Universidad", value: universityLabel(student.university) },
    { label: "Jornada", value: studyShiftLabel(student.studyShift) },
    { label: "Fecha de nacimiento", value: formatBirthDate(student.birthDate) },
  ];

  return (
    <div className={cn("gap-4", stacked ? "flex flex-col" : "grid sm:grid-cols-4")}>
      {fields.map((field) => (
        <div key={field.label}>
          <p className="text-xs text-zinc-500">{field.label}</p>
          <p className="text-sm text-white">{field.value || "Sin registrar"}</p>
        </div>
      ))}
    </div>
  );
}

/** Amarillo para quien tiene 45 años o más: RUT, nombre y edad. */
const OLDER_TEXT = "text-yellow-300";

function older(student: Student): boolean {
  return isOlder(ageOf(student.birthDate));
}

/** La edad; desde los 45 anos va en amarillo y con una marca de texto, para no depender solo del color. */
function AgeCell({ age }: { age: number | null }) {
  if (age === null) return <span className="text-zinc-500">—</span>;

  if (!isOlder(age)) return <span className="text-zinc-400">{age}</span>;

  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-yellow-300">
      {age}
      <span
        title="Tiene 45 años o más"
        className="rounded border border-yellow-300/60 px-1 text-[10px] font-semibold leading-4"
      >
        45+
        <span className="sr-only"> (45 años o más)</span>
      </span>
    </span>
  );
}

function StudentActions({
  student,
  isEditing,
  isViewing,
  onToggle,
  onEdit,
  onView,
  onPassword,
}: {
  student: Student;
  isEditing: boolean;
  isViewing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onView: () => void;
  onPassword: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-28 rounded-lg bg-white px-3 py-1.5 text-center text-sm font-medium transition-colors",
          student.enabled
            ? "text-rose-600 hover:bg-rose-500/20"
            : "text-emerald-600 hover:bg-emerald-500/20",
        )}
      >
        {student.enabled ? "Inhabilitar" : "Habilitar"}
      </button>

      {!isEditing && (
        <button
          type="button"
          onClick={onEdit}
          title="Modificar"
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <Pencil className="size-4" />
        </button>
      )}

      <button
        type="button"
        onClick={onPassword}
        title="Generar nueva contraseña"
        aria-label="Generar nueva contraseña"
        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
      >
        <KeyRound className="size-4" />
      </button>

      {!isEditing && (
        <button
          type="button"
          onClick={onView}
          title="Mostrar"
          className={cn(
            "rounded-lg p-1.5 transition-colors hover:bg-zinc-800 hover:text-white",
            isViewing ? "bg-zinc-800 text-white" : "text-zinc-400",
          )}
        >
          <Eye className="size-4" />
        </button>
      )}
    </div>
  );
}

type StudentsSectionProps = {
  searchQuery: string;
  isActive: boolean;
};

// Ultimo listado recibido. Al volver a esta pantalla (desde estadisticas, por ejemplo) se
// muestra al instante mientras el servidor entrega el actualizado, en vez de una
// pantalla vacia con "Cargando...". Solo vive en memoria: al recargar la pagina se pierde.
let lastStudents: Student[] | null = null;

export function StudentsSection({ searchQuery, isActive  }: StudentsSectionProps) {
  const [students, setStudents] = useState<Student[]>(() => lastStudents ?? []);
  const [isLoading, setIsLoading] = useState(lastStudents === null);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  const [editingRut, setEditingRut] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(EMPTY_EDIT_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [viewingRut, setViewingRut] = useState<string | null>(null);
  const [passwordFor, setPasswordFor] = useState<Student | null>(null);

  const isCardView = !useMediaQuery("(min-width: 1024px)");
  const pageSize = isCardView ? 5 : 12;

  // Ordenada la lista completa (no solo la pagina), por la columna elegida; por defecto, de mayor a menor edad.
  const filteredStudents = sortStudents(
    students.filter((s) => matchesQuery(s, searchQuery)),
    sort,
  );

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginatedStudents = filteredStudents.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  function changeSort(next: SortState) {
    setSort(next);
    setPage(1);
  }

  async function loadStudents() {
    // Con un listado ya a la vista (o recordado) se actualiza sin taparlo con "Cargando...".
    if (lastStudents === null) setIsLoading(true);
    const result = await listStudentsAction();
    if (result.success) {
      lastStudents = result.data;
      setStudents(result.data);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadStudents();
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

    if (!form.paralelo) {
      setFormError("Selecciona un paralelo.");
      return;
    }

    const emailError = optionalEmailProblem(form.email);

    if (emailError) {
      setFormError(emailError);
      return;
    }

    setIsCreating(true);

    const result = await createStudentAction({
      rut: form.rut,
      firstName: form.firstName,
      paternalLastName: form.paternalLastName,
      maternalLastName: form.maternalLastName,
      paralelo: Number(form.paralelo) as Paralelo,
      comuna: form.comuna || undefined,
      region: form.region || undefined,
      celular: form.celular || undefined,
      email: form.email || undefined,
      gender: form.gender || undefined,
      university: form.university || undefined,
      studyShift: form.studyShift || undefined,
      birthDate: form.birthDate || undefined,
    });

    setIsCreating(false);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    setForm(EMPTY_FORM);
    setShowForm(false);
    await loadStudents();
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

  async function handleToggle(student: Student) {
    await setStudentEnabledAction(student.rut, !student.enabled);
    await loadStudents();
  }

  function handleStartEdit(student: Student) {
    setViewingRut(null);
    setEditingRut(student.rut);
    setEditError(null);
    setEditForm({
      firstName: student.firstName,
      paternalLastName: student.paternalLastName,
      maternalLastName: student.maternalLastName,
      email: student.email ?? "",
      // Las fichas antiguas pueden traerlas escritas a mano: se muestran con su nombre oficial, o «Seleccionar»
      // si no coinciden con la lista.
      ...placeForSelects(student.region, student.comuna),
      celular: student.celular ?? "",
      gender: student.gender ?? "",
      university: student.university ?? "",
      studyShift: student.studyShift ?? "",
      birthDate: toInputDate(student.birthDate),
    });
  }

  function handleToggleView(student: Student) {
    setEditingRut(null);
    setViewingRut((current) => (current === student.rut ? null : student.rut));
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();

    if (!editingRut) return;

    setEditError(null);

    if (
      !editForm.firstName.trim() ||
      !editForm.paternalLastName.trim() ||
      !editForm.maternalLastName.trim()
    ) {
      setEditError("Nombres y apellidos no pueden quedar vacíos.");
      return;
    }

    const emailError = optionalEmailProblem(editForm.email);

    if (emailError) {
      setEditError(emailError);
      return;
    }

    const current = students.find((s) => s.rut === editingRut);

    // Campo vacio = se borra de la ficha. La fecha solo se manda si el admin la
    // cambio: una fecha antigua que el selector no entiende quedaria vacia y se
    // borraria sin querer al guardar otro dato.
    const birthDateChanged =
      editForm.birthDate !== toInputDate(current?.birthDate);

    const savedPlace = placeForSelects(current?.region, current?.comuna);
    const regionChanged = editForm.region !== savedPlace.region;
    // Una comuna antigua que la lista no reconoce se veria vacia y se borraria sin querer al guardar otro dato:
    // solo se manda si se cambio (o si cambio la region, que puede dejarla sin comuna).
    const comunaChanged = regionChanged || editForm.comuna !== savedPlace.comuna;

    const result = await updateStudentDetailsAction(editingRut, {
      firstName: editForm.firstName,
      paternalLastName: editForm.paternalLastName,
      maternalLastName: editForm.maternalLastName,
      email: editForm.email,
      celular: editForm.celular,
      gender: editForm.gender,
      university: editForm.university,
      studyShift: editForm.studyShift,
      ...(birthDateChanged && { birthDate: editForm.birthDate }),
      ...(regionChanged && { region: editForm.region }),
      ...(comunaChanged && { comuna: editForm.comuna }),
    });

    if (!result.success) {
      setEditError(result.message);
      return;
    }

    setEditingRut(null);
    await loadStudents();
  }

  const emptyMessage =
    students.length === 0
      ? "No hay estudiantes registrados."
      : "No hay estudiantes que coincidan con la busqueda.";

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={handleToggleForm}
        className="flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
      >
        <Plus className="size-4" />
        {showForm ? "Cancelar" : "Agregar estudiante"}
      </button>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-4 rounded-2xl border border-zinc-800 p-4 sm:grid-cols-2"
        >
          <Field>
            <FieldLabel htmlFor="rut">RUT</FieldLabel>
            <RutInput
              id="rut"
              value={form.rut}
              onChange={(value) => setForm({ ...form, rut: value })}
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="firstName">Nombres</FieldLabel>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) =>
                setForm({ ...form, firstName: formatNameInput(e.target.value) })
              }
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="paternalLastName">Apellido paterno</FieldLabel>
            <Input
              id="paternalLastName"
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
            <FieldLabel htmlFor="maternalLastName">Apellido materno</FieldLabel>
            <Input
              id="maternalLastName"
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

          <Field>
            <FieldLabel htmlFor="university">Universidad</FieldLabel>
            <select
              id="university"
              value={form.university}
              onChange={(e) =>
                setForm({ ...form, university: e.target.value as University | "" })
              }
              className="h-12 w-full rounded-xl border border-zinc-700 bg-transparent px-4 text-white outline-none transition focus:border-white"
            >
              <option value="" className="bg-zinc-900">
                Sin registrar
              </option>
              {UNIVERSITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-zinc-900">
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="paralelo">Paralelo</FieldLabel>
            <select
              id="paralelo"
              value={form.paralelo}
              onChange={(e) => setForm({ ...form, paralelo: e.target.value })}
              required
              className="h-12 w-full rounded-xl border border-zinc-700 bg-transparent px-4 text-white outline-none transition focus:border-white"
            >
              <option value="" disabled className="bg-zinc-900">
                Seleccione
              </option>
              {PARALELO_OPTIONS.map((n) => (
                <option key={n} value={n} className="bg-zinc-900">
                  {n}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="studyShift">Jornada</FieldLabel>
            <select
              id="studyShift"
              value={form.studyShift}
              onChange={(e) =>
                setForm({ ...form, studyShift: e.target.value as StudyShift | "" })
              }
              className="h-12 w-full rounded-xl border border-zinc-700 bg-transparent px-4 text-white outline-none transition focus:border-white"
            >
              <option value="" className="bg-zinc-900">
                Sin registrar
              </option>
              {STUDY_SHIFT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-zinc-900">
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="email">Correo</FieldLabel>
            <EmailInput
              id="email"
              value={form.email}
              onChange={(email) => setForm({ ...form, email })}
            />
          </Field>

          <RegionCommuneFields
            idPrefix="create"
            region={form.region}
            comuna={form.comuna}
            onChange={(place) => setForm({ ...form, ...place })}
            selectClassName="h-12 w-full rounded-xl border border-zinc-700 bg-transparent px-4 text-white outline-none transition focus:border-white disabled:opacity-50"
            optionClassName="bg-zinc-900"
            allowClear
          />

          <Field>
            <FieldLabel htmlFor="celular">Celular</FieldLabel>
            <div className="flex h-12 w-full items-center gap-2 rounded-xl border border-zinc-700 bg-transparent px-4 transition focus-within:border-white">
              <span className="text-sm text-zinc-500">+569</span>
              <input
                id="celular"
                type="text"
                inputMode="numeric"
                value={form.celular}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 8);
                  setForm({ ...form, celular: digitsOnly });
                }}
                placeholder="12345678"
                className="h-full min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-500"
              />
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="gender">Género</FieldLabel>
            <select
              id="gender"
              value={form.gender}
              onChange={(e) =>
                setForm({ ...form, gender: e.target.value as Gender | "" })
              }
              className="h-12 w-full rounded-xl border border-zinc-700 bg-transparent px-4 text-white outline-none transition focus:border-white"
            >
              <option value="" className="bg-zinc-900">
                Sin registrar
              </option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-zinc-900">
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field>
            <FieldLabel htmlFor="birthDate">Fecha de nacimiento</FieldLabel>
            <Input
              id="birthDate"
              type="date"
              className="scheme-dark"
              min={birthDateRange().min}
              max={birthDateRange().max}
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </Field>

          <div className="flex items-end">
            <Button
              type="submit"
              disabled={isCreating}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {isCreating ? "Creando..." : "Crear estudiante"}
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

          {!isLoading && filteredStudents.length === 0 && (
            <p className="text-center text-zinc-500">{emptyMessage}</p>
          )}

          {!isLoading && filteredStudents.length > 0 && (
            <div className="hidden overflow-x-auto rounded-2xl border border-zinc-800 lg:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    {(["rut", "name", "university", "paralelo", "age", "entry", "status"] as const).map((key: SortKey) => (
                      <SortableHeader key={key} sortKey={key} sort={sort} onSort={(k) => changeSort(nextSort(sort, k))} />
                    ))}
                    <th className="p-3 font-normal" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((student) => (
                    <Fragment key={student.rut}>
                      <tr className="border-b border-zinc-800/50 last:border-0">
                        <td className={cn("p-3", older(student) && OLDER_TEXT)}>{student.rut}</td>
                        <td className={cn("p-3", older(student) && OLDER_TEXT)}>
                          <HighlightMatch
                            text={`${student.firstName} ${student.paternalLastName} ${student.maternalLastName}`}
                            query={searchQuery}
                          />
                        </td>
                        <td className="p-3 text-zinc-400">{universityLabel(student.university) ?? "Sin registrar"}</td>
                        <td className="p-3 text-zinc-400">{student.paralelo}</td>
                        <td className="p-3">
                          <AgeCell age={ageOf(student.birthDate)} />
                        </td>
                        <td className="p-3 text-zinc-400">{student.entryYear}</td>
                        <td className="p-3">
                          <span
                            className={
                              student.enabled ? "text-emerald-400" : "text-rose-400"
                            }
                          >
                            {student.enabled ? "Habilitado" : "Inhabilitado"}
                          </span>
                        </td>
                        <td className="p-3">
                          <StudentActions
                            student={student}
                            isEditing={editingRut === student.rut}
                            isViewing={viewingRut === student.rut}
                            onToggle={() => handleToggle(student)}
                            onEdit={() => handleStartEdit(student)}
                            onView={() => handleToggleView(student)}
                            onPassword={() => setPasswordFor(student)}
                          />
                        </td>
                      </tr>

                      {editingRut === student.rut && (
                        <tr className="border-b border-zinc-800/50 bg-zinc-900/50">
                          <td colSpan={8} className="p-3">
                            <StudentEditForm
                              editForm={editForm}
                              setEditForm={setEditForm}
                              editError={editError}
                              studentRut={student.rut}
                              onSubmit={handleSaveEdit}
                              onCancel={() => setEditingRut(null)}
                            />
                          </td>
                        </tr>
                      )}

                      {viewingRut === student.rut && (
                        <tr className="border-b border-zinc-800/50 bg-zinc-900/50">
                          <td colSpan={8} className="p-3">
                            <StudentDetailsView student={student} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && filteredStudents.length > 0 && (
            <div className="flex flex-col gap-3 lg:hidden">
              <StudentSortBar sort={sort} onChange={changeSort} />

              {paginatedStudents.map((student) => (
                <div
                  key={student.rut}
                  className="rounded-2xl border border-zinc-800 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn("font-medium text-white", older(student) && OLDER_TEXT)}>
                        <HighlightMatch
                          text={`${student.firstName} ${student.paternalLastName} ${student.maternalLastName}`}
                          query={searchQuery}
                        />
                      </p>
                      <p className={cn("text-xs text-zinc-500", older(student) && OLDER_TEXT)}>{student.rut}</p>
                    </div>

                    <span
                      className={cn(
                        "text-xs font-medium",
                        student.enabled ? "text-emerald-400" : "text-rose-400",
                      )}
                    >
                      {student.enabled ? "Habilitado" : "Inhabilitado"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <span>{universityLabel(student.university) ?? "Universidad sin registrar"}</span>
                    <span>Paralelo {student.paralelo}</span>
                    <span>Ingreso {student.entryYear}</span>
                    <span className="flex items-center gap-1">
                      Edad <AgeCell age={ageOf(student.birthDate)} />
                    </span>
                  </div>

                  <div className="mt-3">
                    <StudentActions
                      student={student}
                      isEditing={editingRut === student.rut}
                      isViewing={viewingRut === student.rut}
                      onToggle={() => handleToggle(student)}
                      onEdit={() => handleStartEdit(student)}
                      onView={() => handleToggleView(student)}
                      onPassword={() => setPasswordFor(student)}
                    />
                  </div>

                  {editingRut === student.rut && (
                    <div className="mt-3 border-t border-zinc-800 pt-3">
                      <StudentEditForm
                        editForm={editForm}
                        setEditForm={setEditForm}
                        editError={editError}
                        studentRut={student.rut}
                        onSubmit={handleSaveEdit}
                        onCancel={() => setEditingRut(null)}
                        stacked
                      />
                    </div>
                  )}

                  {viewingRut === student.rut && (
                    <div className="mt-3 border-t border-zinc-800 pt-3">
                      <StudentDetailsView student={student} stacked />
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
            kind: "student",
            notRegistered: !passwordFor.registered,
          }}
          generate={(adminPassword) => generateStudentPasswordAction(passwordFor.rut, adminPassword)}
          onClose={() => setPasswordFor(null)}
          onGenerated={loadStudents}
        />
      )}
    </div>
  );
}