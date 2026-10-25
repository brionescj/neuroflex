import { Copy, Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { toast } from "sonner";

import { InputGroup, InputGroupInput } from "@/components/ui/InputGroup";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value: string;

  onChange?: (value: string) => void;

  /** Si se pasa, quien usa el campo decide cuando se ve la contraseña (por ejemplo, al generarla). */
  visible?: boolean;

  onVisibleChange?: (visible: boolean) => void;

  /** Agrega un boton para copiar la contraseña. */
  copyable?: boolean;

  groupClassName?: string;
};

const ICON_BUTTON =
  "flex h-full w-11 shrink-0 cursor-pointer items-center justify-center text-zinc-400 transition-colors hover:text-white";

/**
 * Campo de contraseña con el icono de mostrar / ocultar. Es un campo controlado
 * simple (sin react-hook-form), para los formularios del panel de administracion.
 */
export function PasswordInput({
  value,
  onChange,
  visible,
  onVisibleChange,
  copyable = false,
  groupClassName,
  className,
  ...props
}: PasswordInputProps) {
  const [ownVisible, setOwnVisible] = useState(false);
  const isVisible = visible ?? ownVisible;

  function toggle() {
    const next = !isVisible;

    setOwnVisible(next);
    onVisibleChange?.(next);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Contraseña copiada.");
    } catch {
      toast.error("No se pudo copiar. Selecciónela y cópiela a mano.");
    }
  }

  return (
    <InputGroup className={cn("min-w-0", groupClassName)}>
      <InputGroupInput
        {...props}
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn("min-w-0", className)}
      />

      {copyable && (
        <button type="button" onClick={copy} disabled={value === ""} title="Copiar contraseña" aria-label="Copiar contraseña" className={cn(ICON_BUTTON, "disabled:cursor-default disabled:opacity-40 disabled:hover:text-zinc-400")}>
          <Copy className="size-4" />
        </button>
      )}

      <button
        type="button"
        onClick={toggle}
        title={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-label={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={isVisible}
        className={ICON_BUTTON}
      >
        {isVisible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </InputGroup>
  );
}
