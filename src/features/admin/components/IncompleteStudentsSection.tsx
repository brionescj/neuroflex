import { Download, Eye, Phone } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { universityLabel } from "@/config/studentOptions";
import { cn } from "@/lib/utils";
import type { Student } from "@/types";

import { listStudentsAction, setStudentContactedAction } from "../actions/students.action";
import { downloadIncompleteExcel } from "../utils/incompleteExcel";
import {
  CONTACT_OPTIONS,
  matchesContactFilter,
  studentsWithMissingData,
  type ContactFilter,
  type MissingField,
} from "../utils/incompleteProfile";
import { matchesQuery } from "../utils/matchesQuery";
import { HighlightMatch } from "./HighlightMatch";
import { Pagination } from "./Pagination";

/** Estudiantes por pagina, igual que en la lista de estudiantes. */
const PER_PAGE = 7;

type IncompleteStudentsSectionProps = {
  searchQuery: string;
  isActive: boolean;
};

const fullName = (student: Student) => `${student.firstName} ${student.paternalLastName} ${student.maternalLastName}`;

function PhoneLink({ student, className }: { student: Student; className?: string }) {
  if (!student.celular) return <span className={cn("text-amber-300", className)}>Sin celular</span>;

  return (
    <a
      href={`tel:+569${student.celular}`}
      className={cn("inline-flex items-center gap-1.5 text-zinc-300 underline-offset-2 hover:text-white hover:underline", className)}
    >
      <Phone className="size-3.5 shrink-0" aria-hidden="true" />+569 {student.celular}
    </a>
  );
}

/** Lo que falta, separado entre lo que el estudiante completa desde su perfil y lo que solo registra un administrador. */
function MissingList({ missing }: { missing: MissingField[] }) {
  const byStudent = missing.filter((field) => field.byStudent);
  const byAdmin = missing.filter((field) => !field.byStudent);

  return (
    <div className="flex flex-col gap-3">
      {byStudent.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500">Los completa el estudiante</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {byStudent.map((field) => (
              <li key={field.key} className="rounded-full bg-amber-500/15 px-3 py-1 text-sm text-amber-300">
                {field.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {byAdmin.length > 0 && (
        <div>
          <ul className="flex flex-wrap gap-2">
            {byAdmin.map((field) => (
              <li key={field.key} className="rounded-full bg-zinc-800 px-3 py-1 text-sm text-zinc-300">
                {field.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** «Falta contactar» / «Contactado»: dos alternativas, en ambar y verde para reconocerlas de un vistazo. */
function ContactSelect({
  student,
  disabled,
  onChange,
  className,
}: {
  student: Student;
  disabled: boolean;
  onChange: (contacted: boolean) => void;
  className?: string;
}) {
  const contacted = student.contacted === true;

  return (
    <select
      aria-label={`Contacto con ${fullName(student)}`}
      value={contacted ? "contacted" : "pending"}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value === "contacted")}
      className={cn(
        "h-10 rounded-lg border bg-zinc-900 px-2 text-sm font-medium outline-none transition focus:border-white disabled:opacity-50",
        contacted ? "border-emerald-500/50 text-emerald-300" : "border-amber-500/50 text-amber-300",
        className,
      )}
    >
      {CONTACT_OPTIONS.map((option) => (
        <option key={option.value} value={option.value} className="bg-zinc-900 text-white">
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ViewButton({ isOpen, name, onClick }: { isOpen: boolean; name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ver los datos que faltan"
      aria-label={`Ver los datos que le faltan a ${name}`}
      aria-expanded={isOpen}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-zinc-800 hover:text-white",
        isOpen ? "bg-zinc-800 text-white" : "text-zinc-400",
      )}
    >
      <Eye className="size-4" />
    </button>
  );
}

/**
 * «Datos incompletos»: los estudiantes habilitados a los que les falta algun dato de la ficha, para que el
 * administrador los llame y les pida completar su perfil. El ojo abre la lista de lo que falta. Se vuelve a pedir
 * cada vez que se abre la pestana, porque el estudiante o el administrador pueden haberla completado desde entonces.
 */
export function IncompleteStudentsSection({ searchQuery, isActive }: IncompleteStudentsSectionProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [openRut, setOpenRut] = useState<string | null>(null);
  const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
  const [savingRut, setSavingRut] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    listStudentsAction().then((result) => {
      if (cancelled) return;

      if (result.success) setStudents(result.data);
      setFailed(!result.success);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isActive]);

  // Los mas incompletos primero; a igual cantidad, por apellido.
  const incomplete = studentsWithMissingData(students).sort(
    (a, b) =>
      b.missing.length - a.missing.length ||
      a.student.paternalLastName.localeCompare(b.student.paternalLastName, "es") ||
      a.student.firstName.localeCompare(b.student.firstName, "es"),
  );
  const pendingCount = incomplete.filter((entry) => entry.student.contacted !== true).length;
  const filtered = incomplete.filter(
    (entry) => matchesQuery(entry.student, searchQuery) && matchesContactFilter(entry.student, contactFilter),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, contactFilter]);

  /** Se ve el cambio al instante; si el servidor no lo guarda, vuelve a como estaba y se avisa. */
  async function changeContact(student: Student, contacted: boolean) {
    setContactError(null);
    setSavingRut(student.rut);
    setStudents((current) => current.map((item) => (item.rut === student.rut ? { ...item, contacted } : item)));

    const result = await setStudentContactedAction(student.rut, contacted);

    if (!result.success) {
      setStudents((current) =>
        current.map((item) => (item.rut === student.rut ? { ...item, contacted: student.contacted } : item)),
      );
      setContactError(`No se pudo guardar el contacto de ${fullName(student)}: ${result.message}`);
    }

    setSavingRut(null);
  }

  async function handleDownload() {
    setIsExporting(true);

    try {
      await downloadIncompleteExcel(filtered);
    } finally {
      setIsExporting(false);
    }
  }

  function toggle(rut: string) {
    setOpenRut((current) => (current === rut ? null : rut));
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Estudiantes con datos incompletos</h2>
        <p className="text-sm text-zinc-400">
          {isLoading
            ? "Cargando..."
            : `${incomplete.length} ${incomplete.length === 1 ? "estudiante habilitado tiene" : "estudiantes habilitados tienen"} datos por completar.`}{" "}
          Llámalos y pídeles que completen su perfil.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1 sm:w-64">
          <label htmlFor="contact-filter" className="text-xs text-zinc-500">
            Mostrar
          </label>
          <select
            id="contact-filter"
            value={contactFilter}
            onChange={(event) => setContactFilter(event.target.value as ContactFilter)}
            className="h-10 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none transition focus:border-white"
          >
            <option value="all" className="bg-zinc-900">
              Todos ({incomplete.length})
            </option>
            <option value="pending" className="bg-zinc-900">
              Falta contactar ({pendingCount})
            </option>
            <option value="contacted" className="bg-zinc-900">
              Contactado ({incomplete.length - pendingCount})
            </option>
          </select>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleDownload}
          disabled={isLoading || filtered.length === 0 || isExporting}
          className="sm:w-auto"
        >
          <Download className="size-4" aria-hidden="true" />
          {isExporting ? "Preparando..." : `Descargar Excel (${filtered.length})`}
        </Button>
      </div>

      {contactError && (
        <p role="alert" className="text-sm text-rose-400">
          {contactError}
        </p>
      )}

      {failed && <p className="text-center text-rose-400">No se pudo cargar la lista. Intenta de nuevo.</p>}

      {!isLoading && !failed && filtered.length === 0 && (
        <p className="text-center text-zinc-500">
          {searchQuery.trim() || contactFilter !== "all"
            ? "Ningún estudiante coincide con la búsqueda."
            : "Todos los estudiantes tienen sus datos completos."}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="hidden overflow-x-auto rounded-2xl border border-zinc-800 lg:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                {["Nombre", "RUT", "Universidad", "Paralelo", "Celular", "Faltan", "Contacto"].map((heading) => (
                  <th key={heading} className="p-3 font-normal">
                    {heading}
                  </th>
                ))}
                <th className="p-3 font-normal">
                  <span className="sr-only">Ver datos</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ student, missing }) => (
                <Fragment key={student.rut}>
                  <tr className="border-b border-zinc-800/50 last:border-0">
                    <td className="p-3">
                      <HighlightMatch text={fullName(student)} query={searchQuery} />
                      {!student.registered && <span className="ml-2 text-xs text-zinc-500">Aún no se registra</span>}
                    </td>
                    <td className="p-3 text-zinc-400">{student.rut}</td>
                    <td className="p-3 text-zinc-400">{universityLabel(student.university) ?? "Sin registrar"}</td>
                    <td className="p-3 text-zinc-400">{student.paralelo}</td>
                    <td className="p-3">
                      <PhoneLink student={student} />
                    </td>
                    <td className="p-3 text-amber-300">{missing.length}</td>
                    <td className="p-3">
                      <ContactSelect
                        student={student}
                        disabled={savingRut === student.rut}
                        onChange={(contacted) => changeContact(student, contacted)}
                      />
                    </td>
                    <td className="p-3">
                      <ViewButton isOpen={openRut === student.rut} name={fullName(student)} onClick={() => toggle(student.rut)} />
                    </td>
                  </tr>

                  {openRut === student.rut && (
                    <tr className="border-b border-zinc-800/50 bg-zinc-900/50">
                      <td colSpan={8} className="p-3">
                        <MissingList missing={missing} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="flex flex-col gap-3 lg:hidden">
          {visible.map(({ student, missing }) => (
            <div key={student.rut} className="rounded-2xl border border-zinc-800 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-white">
                    <HighlightMatch text={fullName(student)} query={searchQuery} />
                  </p>
                  <p className="text-xs text-zinc-500">
                    {student.rut}
                    {!student.registered && " · Aún no se registra"}
                  </p>
                </div>

                <ViewButton isOpen={openRut === student.rut} name={fullName(student)} onClick={() => toggle(student.rut)} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                <span>{universityLabel(student.university) ?? "Universidad sin registrar"}</span>
                <span>Paralelo {student.paralelo}</span>
                <span className="text-amber-300">
                  Faltan {missing.length} {missing.length === 1 ? "dato" : "datos"}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <PhoneLink student={student} />

                <ContactSelect
                  student={student}
                  disabled={savingRut === student.rut}
                  onChange={(contacted) => changeContact(student, contacted)}
                />
              </div>

              {openRut === student.rut && (
                <div className="mt-3 border-t border-zinc-800 pt-3">
                  <MissingList missing={missing} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
