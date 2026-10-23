import { forwardRef } from "react";

import { Input } from "@/components/ui/Input";
import { sanitizeEmailInput } from "@/utils/email";

interface EmailInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type"> {
  value?: string;

  onChange?: (value: string) => void;
}

/**
 * Campo de correo que solo deja escribir lo que un correo admite: pasa las
 * mayusculas a minusculas y descarta ñ, tildes, espacios y simbolos. Es de
 * tipo "text" (con teclado de correo en el movil) porque los campos
 * type="email" no permiten reubicar el cursor.
 */
const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  ({ value = "", onChange, ...props }, ref) => {
    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      const input = event.target;
      const typed = input.value;
      const clean = sanitizeEmailInput(typed);

      onChange?.(clean);

      // Si se corrigio algo, React devuelve el cursor al final: se deja donde
      // estaba el usuario (en la posicion equivalente del texto ya limpio).
      // Va en una microtarea y no en un cuadro de animacion: asi corre justo
      // despues de que React restaura el valor y antes de la tecla siguiente.
      if (clean !== typed) {
        const caret = sanitizeEmailInput(
          typed.slice(0, input.selectionStart ?? typed.length),
        ).length;

        queueMicrotask(() => input.setSelectionRange(caret, caret));
      }
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="email"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="nombre@dominio.cl"
        value={value}
        onChange={handleChange}
        {...props}
      />
    );
  },
);

EmailInput.displayName = "EmailInput";

export { EmailInput };
