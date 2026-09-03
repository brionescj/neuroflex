import { z } from "zod";

import { AVATARS, type AvatarId } from "@/config/avatars";
import { EmailSchema } from "@/services/profile.schema";

const avatarIds = Object.keys(AVATARS) as [AvatarId, ...AvatarId[]];

export const ProfileFormSchema = z.object({
  email: EmailSchema,
  avatarId: z.enum(avatarIds),
});

export type ProfileFormInput = z.infer<typeof ProfileFormSchema>;