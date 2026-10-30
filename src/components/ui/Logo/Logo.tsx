import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Logo de Neuroflex. Es un archivo estatico (`public/logo-neuroflex.svg`) y no
 * un import: asi no entra al JS inicial y el navegador lo guarda en cache.
 * El alto sale del ancho (relacion 2011 x 330), por eso no hay salto de diseño al cargar.
 */
export function Logo({ className, ...props }: Omit<ComponentProps<"img">, "src" | "alt">) {
  return (
    <img
      src="/logo-neuroflex.svg"
      alt="Neuroflex"
      width={2011}
      height={330}
      decoding="async"
      className={cn("h-auto select-none", className)}
      draggable={false}
      {...props}
    />
  );
}
