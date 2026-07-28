import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
type InputProps = ComponentProps<"input">;

export function Input({
  className,
  type = "text",
  ...props
}: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12",
        "w-full",
        "rounded-xl",
        "border",
        "border-zinc-700",
        "bg-transparent",
        "px-4",
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