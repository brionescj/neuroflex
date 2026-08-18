import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/Field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/InputGroup";

type Props = {
  id: string;

  label: string;

  name: string;

  value: string;

  onChange: (...event: unknown[]) => void;

  onBlur: () => void;

  message?: string | undefined;
};

export function PasswordField({
  id,
  label,
  name,
  value,
  onChange,
  onBlur,
  message,
}: Props) {
  const [visible, setVisible] = useState(false);

  const invalid = message !== undefined;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id} className="text-white">
        {label}
      </FieldLabel>

      <InputGroup className="h-13 border border-zinc-700 text-white">
        <InputGroupInput
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          type={visible ? "text" : "password"}
          placeholder="********"
          autoComplete="off"
          aria-invalid={invalid}
        />

        <InputGroupAddon
          className="cursor-pointer"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOff className="size-5" />
          ) : (
            <Eye className="size-5" />
          )}
        </InputGroupAddon>
      </InputGroup>

      <FieldError errors={[{ message }]} />
    </Field>
  );
}
