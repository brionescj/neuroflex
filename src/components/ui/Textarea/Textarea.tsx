import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

type TextareaProps = ComponentProps<"textarea">;

export function Textarea({
  className,
  ...props
}: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-32",
        "w-full",
        "rounded-xl",
        "border",
        "border-zinc-700",
        "bg-transparent",
        "p-4",
        "text-white",
        "outline-none",
        "transition",
        "placeholder:text-zinc-500",
        "focus:border-white",
        className
      )}
      {...props}
    />
  );
}