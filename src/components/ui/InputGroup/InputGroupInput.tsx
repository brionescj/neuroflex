import type { ComponentProps } from "react";

import { Input } from "../Input";

type InputGroupInputProps = ComponentProps<typeof Input>;

export function InputGroupInput(props: InputGroupInputProps) {
  return (
    <Input
      className="border-0 bg-transparent shadow-none focus:border-transparent focus:ring-0"
      {...props}
    />
  );
}