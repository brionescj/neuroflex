import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type InputGroupProps = ComponentProps<"div">;

export function InputGroup({
  className,
  children,
  ...props
}: InputGroupProps) {
  return (
    <div
      className={cn(
        "flex h-12 w-full items-center rounded-xl border border-zinc-700 bg-transparent",
        "focus-within:border-white transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}