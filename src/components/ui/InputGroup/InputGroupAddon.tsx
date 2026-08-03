import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type Props = ComponentProps<"div">;

export function InputGroupAddon({
  className,
  children,
  ...props
}: Props) {
  return (
    <div
      className={cn(
        "flex h-full items-center justify-center px-4 text-zinc-400",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}