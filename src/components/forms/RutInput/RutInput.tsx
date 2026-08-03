import { forwardRef } from "react";
import { Input } from "@/components/ui/Input";
import { addHyphen, cleanRut, formatRut } from "@/utils/rut";

interface RutInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value?: string;

  onChange?: (value: string) => void;
}

const RutInput = forwardRef<HTMLInputElement, RutInputProps>(
  ({ value = "", onChange, ...props }, ref) => {
    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      const rawValue = event.target.value;

      const clean = cleanRut(rawValue);

      const normalized = addHyphen(clean);

      onChange?.(normalized);
    }

    return (
      <Input
        ref={ref}
        value={formatRut(value)}
        onChange={handleChange}
        autoComplete="off"
        inputMode="numeric"
        placeholder="12.345.678-5"
        {...props}
      />
    );
  },
);

RutInput.displayName = "RutInput";

export { RutInput };