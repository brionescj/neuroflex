import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type InputGroupAddonProps = ComponentProps<"div">;

export function InputGroupAddon({
  className,
  children,
  ...props
}: InputGroupAddonProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center px-3 text-zinc-400",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}