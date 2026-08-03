import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type Props = ComponentProps<"input">;

export function InputGroupInput({
  className,
  ...props
}: Props) {
  return (
    <input
      className={cn(
        "h-full flex-1 bg-transparent px-4 text-white outline-none placeholder:text-zinc-500",
        className,
      )}
      {...props}
    />
  );
}