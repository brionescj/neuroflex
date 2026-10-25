import { KeyRound } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldLabel } from "@/components/ui/Field";
import { PasswordInput } from "@/features/auth/components";
import type { Student } from "@/types";

import { generateStudentPasswordAction } from "../actions/students.action";
import type { GeneratedStudentPassword } from "../services/students.service";

type StudentPasswordDialogProps = {
  student: Student;
  onClose: () => void;
  /** Se avisa al generarla, para que la lista se actualice (un estudiante sin cuenta pasa a registrado). */
  onGenerated: () => void;
};

/**
 * Genera una contraseña aleatoria para un estudiante. Primero pide la contraseña
 * del administrador con la sesion iniciada; despues muestra la nueva, una sola
 * vez, para que se la entregue. Funciona tambien con un estudiante que aun no se
 * registro: se le crea la cuenta con esa contraseña.
 */
export function StudentPasswordDialog({ student, onClose, onGenerated }: StudentPasswordDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedStudentPassword | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (adminPassword === "") {
      setError("Ingrese su contraseña para confirmar.");
      return;
    }

    setError(null);
    setIsGenerating(true);

    const result = await generateStudentPasswordAction(student.rut, adminPassword);

    setIsGenerating(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setAdminPassword("");
    setGenerated(result.data);
    onGenerated();
  }

  const fullName = `${student.firstName} ${student.paternalLastName} ${student.maternalLastName}`;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="student-password-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-5 text-white backdrop:bg-black/70"
    >
      {generated ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-emerald-400" />
            <h2 id="student-password-title" className="text-lg font-semibold">
              Contraseña nueva
            </h2>
          </div>

          <p className="text-sm text-zinc-400">
            Para <span className="text-white">{fullName}</span> ({student.rut}).
            {generated.createdAccount && " Se creó su cuenta con esta contraseña: ya no necesita registrarse."}
          </p>

          <Field>
            <FieldLabel htmlFor="generated-password">Contraseña</FieldLabel>
            <PasswordInput id="generated-password" value={generated.password} readOnly copyable />
          </Field>

          <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">
            Se muestra solo ahora y no se puede volver a ver. Entréguesela al estudiante; si la pierde,
            genere otra.
          </p>

          <Button type="button" onClick={onClose} className="bg-white text-black hover:bg-zinc-200">
            Listo
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-zinc-400" />
            <h2 id="student-password-title" className="text-lg font-semibold">
              Generar nueva contraseña
            </h2>
          </div>

          <p className="text-sm text-zinc-400">
            Se creará una contraseña aleatoria para <span className="text-white">{fullName}</span> ({student.rut}) y
            reemplazará la actual.
            {!student.registered &&
              " Aún no se ha registrado: se le creará la cuenta con esta contraseña y ya no usará el formulario de registro."}
          </p>

          <Field>
            <FieldLabel htmlFor="admin-confirm-password">Su contraseña de administrador</FieldLabel>
            <PasswordInput
              id="admin-confirm-password"
              autoComplete="current-password"
              autoFocus
              value={adminPassword}
              onChange={setAdminPassword}
            />
          </Field>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isGenerating}
              className="bg-white text-black hover:bg-zinc-200"
            >
              {isGenerating ? "Generando..." : "Generar contraseña"}
            </Button>

            <Button type="button" variant="outline" onClick={onClose} disabled={isGenerating}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </dialog>
  );
}
