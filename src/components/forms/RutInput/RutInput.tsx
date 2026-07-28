import type { ChangeEvent } from "react";

import { Field } from "@/components/ui/Field";
import { FieldError } from "@/components/ui/Field";
import { FieldLabel } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";

import {
  cleanRut,
  formatRut,
  normalizeForDatabase,
} from "@/utils/rut";

interface RutInputProps {
  label: string;
  placeholder?: string;

  value: string;

  onChange: (value: string) => void;

  onBlur?: () => void;

  error?: string;
}

export function RutInput({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
}: RutInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const rawValue = event.target.value;

    const clean = cleanRut(rawValue);

    const formatted = formatRut(clean);

    onChange(normalizeForDatabase(formatted));
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>

      <Input
        value={formatRut(value)}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={!!error}
      />

      {error && (
        <FieldError>
          {error}
        </FieldError>
      )}
    </Field>
  );
}