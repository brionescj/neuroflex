import { forwardRef } from "react";
import { Input } from "@/components/ui/Input";
import { addHyphen, formatRut, sanitizeRutTyping } from "@/utils/rut";
interface RutInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string;

  onChange?: (value: string) => void;
}

const RutInput = forwardRef<HTMLInputElement, RutInputProps>(
  ({ value = "", onChange, ...props }, ref) => {
    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
  const rawValue = event.target.value;

  const sanitized = sanitizeRutTyping(rawValue);
  const normalized = addHyphen(sanitized);

  onChange?.(normalized);
}

    return (
      <Input
        ref={ref}
        value={formatRut(value)}
        onChange={handleChange}
        autoComplete="off"
        // El dígito verificador puede ser «K»: con inputMode="numeric" los celulares abren un
        // teclado solo de números y no dejan escribirla. Teclado normal + mayúsculas.
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        placeholder="12.345.678-5"
        {...props}
      />
    );
  },
);

RutInput.displayName = "RutInput";

export { RutInput };