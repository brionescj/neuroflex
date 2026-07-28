import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
type FieldContentProps = ComponentProps<"div">;

export function FieldContent({
  className,
  children,
  ...props
}: FieldContentProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}