import type { VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { AVATARS } from "@/config/avatars";
import type { AvatarId } from "@/config/avatars";
import { cn } from "@/lib/utils";
import { avatarVariants } from "./avatarVariants";

type AvatarProps =
  ComponentProps<"div"> &
  VariantProps<typeof avatarVariants> & {
    avatarId: AvatarId;
  };

export function Avatar({
  avatarId,
  size,
  className,
  ...props
}: AvatarProps) {
  const { icon: Icon, color } = AVATARS[avatarId];

  return (
    <div
      className={cn(avatarVariants({ size }), color, className)}
      {...props}
    >
      <Icon className="size-1/2" />
    </div>
  );
}
