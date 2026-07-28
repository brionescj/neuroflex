import { Label } from "../Label";
import type { ComponentProps } from "react";
type FieldLabelProps = ComponentProps<typeof Label>;

export function FieldLabel({
  className,
  ...props
}: FieldLabelProps) {
  return (
    <Label
      className={`text-sm font-medium text-white ${className ?? ""}`}
      {...props}
    />
  );
}