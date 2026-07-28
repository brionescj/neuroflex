import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type SeparatorProps = ComponentProps<typeof SeparatorPrimitive.Root>;

export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        "data-[orientation=horizontal]:h-px",
        "data-[orientation=horizontal]:w-full",
        "data-[orientation=vertical]:w-px",
        "data-[orientation=vertical]:self-stretch",
        className
      )}
      {...props}
    />
  );
}