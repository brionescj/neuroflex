import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { EmailInput } from "@/components/forms/EmailInput";
import { Field, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { emailProblem, normalizeEmail } from "@/utils/email";

import { formatNameInput } from "../utils/sanitizeInput";

export type PersonNames = {
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
};

type AdminNameFormProps = {
  initial: PersonNames;
  /** Prefijo de los id de los campos, para que no se repitan si hay varios formularios en pantalla. */
  idPrefix: string;
  /**
   * El correo actual, solo si el formulario tambien lo edita (el propio perfil del administrador): el
   * campo aparece junto a los nombres y se guarda con el mismo boton.
   */
  email?: string;
  /** Guarda los nombres (y el correo, si se edita); devuelve el mensaje de error, o null si salio bien. */
  onSubmit: (names: PersonNames, email: string) => Promise<string | null>;
  onCancel: () => void;
  /**
   * Con texto, los botones son de texto («Guardar cambios» / «Cancelar cambios», uno al lado del otro); sin el, son
   * el icono de guardar y «Cancelar» (la lista de administradores).
   */
  submitLabel?: string;
  cancelLabel?: string;
  stacked?: boolean;
};

/**
 * Corrige nombres y apellidos de un administrador (el propio o el de otro). El
 * servidor guarda cada palabra con su inicial en mayuscula, igual que se ve aqui.
 */
export function AdminNameForm({
  initial,
  idPrefix,
  email,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  stacked,
}: AdminNameFormProps) {
  const [names, setNames] = useState(initial);
  const [mail, setMail] = useState(email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const clean = {
      firstName: names.firstName.trim(),
      paternalLastName: names.paternalLastName.trim(),
      maternalLastName: names.maternalLastName.trim(),
    };

    if (!clean.firstName || !clean.paternalLastName || !clean.maternalLastName) {
      setError("Nombres y apellidos no pueden quedar vacíos.");
      return;
    }

    // Solo se revisa si lo cambio: quien aun no tiene correo puede corregir su nombre sin escribir uno.
    if (email !== undefined && mail !== email) {
      const problem = emailProblem(normalizeEmail(mail));

      if (problem) {
        setError(problem);
        return;
      }
    }

    setError(null);
    setIsSaving(true);

    const message = await onSubmit(clean, normalizeEmail(mail));

    setIsSaving(false);

    if (message) setError(message);
  }

  const fields: { key: keyof PersonNames; label: string }[] = [
    { key: "firstName", label: "Nombres" },
    { key: "paternalLastName", label: "Apellido paterno" },
    { key: "maternalLastName", label: "Apellido materno" },
  ];

  return (
    <form onSubmit={handleSubmit} className={cn("gap-3", stacked ? "flex flex-col" : "grid sm:grid-cols-3")}>
      {fields.map(({ key, label }) => (
        <Field key={key}>
          <FieldLabel htmlFor={`${idPrefix}-${key}`}>{label}</FieldLabel>
          <Input
            id={`${idPrefix}-${key}`}
            className="h-10"
            value={names[key]}
            onChange={(e) => setNames({ ...names, [key]: formatNameInput(e.target.value) })}
            required
          />
        </Field>
      ))}

      {email !== undefined && (
        <Field className={cn(!stacked && "sm:col-span-3")}>
          <FieldLabel htmlFor={`${idPrefix}-email`}>Correo</FieldLabel>
          <EmailInput
            id={`${idPrefix}-email`}
            className="h-10"
            autoComplete="email"
            value={mail}
            onChange={setMail}
          />
        </Field>
      )}

      {error && <p className={cn("text-sm text-rose-400", !stacked && "sm:col-span-3")}>{error}</p>}

      <div className={cn("flex flex-wrap items-center", submitLabel ? "gap-2" : "gap-3", !stacked && "sm:col-span-3")}>
        <button
          type="submit"
          title={submitLabel ?? "Guardar"}
          disabled={isSaving}
          className={cn(
            "flex h-10 items-center justify-center rounded-lg bg-white text-black transition-colors hover:bg-zinc-200 disabled:opacity-50",
            submitLabel ? "h-11 px-4 text-sm font-semibold" : "w-10",
          )}
        >
          {submitLabel ? (isSaving ? "Guardando..." : submitLabel) : <Save className="size-4" />}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className={cn(
            "flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
            cancelLabel
              ? "min-h-11 px-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              : "h-10 bg-zinc-700 px-4 text-zinc-200 hover:bg-zinc-600",
          )}
        >
          {cancelLabel ?? "Cancelar"}
        </button>
      </div>
    </form>
  );
}
