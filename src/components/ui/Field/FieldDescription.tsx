import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
type FieldDescriptionProps = ComponentProps<"p">;

export function FieldDescription({
  className,
  ...props
}: FieldDescriptionProps) {
  return (
    <p
      className={cn(
        "text-sm text-zinc-400",
        className
      )}
      {...props}
    />
  );
}