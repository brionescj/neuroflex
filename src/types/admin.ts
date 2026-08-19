import type { AvatarId } from "@/config/avatars";

export type Admin = {
  rut: string;

  firstName: string;

  paternalLastName: string;

  maternalLastName: string;

  enabled: boolean;

  email: string;

  avatarId: AvatarId;
};
