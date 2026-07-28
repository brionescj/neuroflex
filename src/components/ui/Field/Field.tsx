import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
type FieldProps = ComponentProps<"div">;

export function Field({
  className,
  children,
  ...props
}: FieldProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}