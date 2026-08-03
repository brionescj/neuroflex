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
        "flex h-12 w-full items-center rounded-xl border border-zinc-700 bg-transparent transition-colors focus-within:border-white",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}