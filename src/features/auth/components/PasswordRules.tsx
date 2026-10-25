import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const PASSWORD_RULES = [
  { label: "Al menos 8 caracteres", test: (v: string) => v.length >= 8 },
  {
    label: "Letras y numeros",
    test: (v: string) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v),
  },
  { label: "Al menos una mayuscula", test: (v: string) => /[A-Z]/.test(v) },
  {
    label: "Al menos un caracter especial",
    test: (v: string) => /[^a-zA-Z0-9]/.test(v),
  },
  {
    label: "Sin digitos repetidos seguidos",
    test: (v: string) => v.length === 0 || !/(\d)\1/.test(v),
  },
];

/** La lista de reglas de contraseña, que se pone en verde a medida que se cumplen. */
export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="space-y-1 pt-1 text-xs">
      {PASSWORD_RULES.map((rule) => {
        const valid = rule.test(password);

        return (
          <li
            key={rule.label}
            className={cn(
              "flex items-center gap-1.5",
              valid ? "text-emerald-400" : "text-zinc-500",
            )}
          >
            <Check className="size-3" />
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
