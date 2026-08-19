import { Cat, Dog, Fish, Panda, Rabbit, Turtle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AvatarId = "cat" | "dog" | "fish" | "rabbit" | "turtle" | "panda";

export const AVATARS: Record<AvatarId, { icon: LucideIcon; color: string }> = {
  cat: { icon: Cat, color: "bg-amber-500" },

  dog: { icon: Dog, color: "bg-sky-500" },

  fish: { icon: Fish, color: "bg-emerald-500" },

  rabbit: { icon: Rabbit, color: "bg-rose-500" },

  turtle: { icon: Turtle, color: "bg-lime-600" },

  panda: { icon: Panda, color: "bg-violet-500" },
};
