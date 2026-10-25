import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Field, FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

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
  /** Guarda los nombres; devuelve el mensaje de error, o null si salio bien. */
  onSubmit: (names: PersonNames) => Promise<string | null>;
  onCancel: () => void;
  stacked?: boolean;
};

/**
 * Corrige nombres y apellidos de un administrador (el propio o el de otro). El
 * servidor guarda cada palabra con su inicial en mayuscula, igual que se ve aqui.
 */
export function AdminNameForm({ initial, idPrefix, onSubmit, onCancel, stacked }: AdminNameFormProps) {
  const [names, setNames] = useState(initial);
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

    setError(null);
    setIsSaving(true);

    const message = await onSubmit(clean);

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

      {error && <p className={cn("text-sm text-rose-400", !stacked && "sm:col-span-3")}>{error}</p>}

      <div className={cn("flex items-center gap-3", !stacked && "sm:col-span-3")}>
        <button
          type="submit"
          title="Guardar"
          disabled={isSaving}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-black transition-colors hover:bg-zinc-200 disabled:opacity-50"
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
