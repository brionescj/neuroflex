import { KeyRound } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field, FieldLabel } from "@/components/ui/Field";
import { PasswordInput } from "@/features/auth/components";
import type { ApiResponse } from "@/types";

/** La contraseña nueva, tal como la entrega el servidor (una sola vez). */
export type GeneratedPassword = {
  password: string;
  /** Solo para estudiantes: aun no tenia cuenta y se le creo con esta contraseña. */
  createdAccount?: boolean;
};

export type PasswordTarget = {
  rut: string;
  fullName: string;
  kind: "student" | "admin";
  /** Estudiante que aun no se registra: se le avisa que se le creara la cuenta. */
  notRegistered?: boolean;
};

type GeneratePasswordDialogProps = {
  target: PasswordTarget;
  /** Pide al servidor la contraseña nueva, con la contraseña del administrador como confirmacion. */
  generate: (adminPassword: string) => Promise<ApiResponse<GeneratedPassword>>;
  onClose: () => void;
  /** Se avisa al generarla, para que la lista se actualice (un estudiante sin cuenta pasa a registrado). */
  onGenerated: () => void;
};

/**
 * Genera una contraseña aleatoria para un estudiante o para otro administrador.
 * Primero pide la contraseña del administrador con la sesion iniciada; despues
 * muestra la nueva, una sola vez, para que se la entregue. Con un estudiante que
 * aun no se registro, se le crea la cuenta con esa contraseña.
 */
export function GeneratePasswordDialog({ target, generate, onClose, onGenerated }: GeneratePasswordDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedPassword | null>(null);

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

    const result = await generate(adminPassword);

    setIsGenerating(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setAdminPassword("");
    setGenerated(result.data);
    onGenerated();
  }

  const who = target.kind === "student" ? "al estudiante" : "al administrador";

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="generate-password-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-5 text-white backdrop:bg-black/70"
    >
      {generated ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-5 text-emerald-400" />
            <h2 id="generate-password-title" className="text-lg font-semibold">
              Contraseña nueva
            </h2>
          </div>

          <p className="text-sm text-zinc-400">
            Para <span className="text-white">{target.fullName}</span> ({target.rut}).
            {generated.createdAccount && " Se creó su cuenta con esta contraseña: ya no necesita registrarse."}
          </p>

          <Field>
            <FieldLabel htmlFor="generated-password">Contraseña</FieldLabel>
            <PasswordInput id="generated-password" value={generated.password} readOnly copyable />
          </Field>

          <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-300">
            Se muestra solo ahora y no se puede volver a ver. Entréguesela {who}; si la pierde,
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
            <h2 id="generate-password-title" className="text-lg font-semibold">
              Generar nueva contraseña
            </h2>
          </div>

          <p className="text-sm text-zinc-400">
            Se creará una contraseña aleatoria para <span className="text-white">{target.fullName}</span> ({target.rut}) y
            reemplazará la actual.
            {target.notRegistered &&
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
