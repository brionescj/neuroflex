import type { AvatarId } from "@/config/avatars";

export type Teacher = {
  rut: string;

  firstName: string;

  paternalLastName: string;

  maternalLastName: string;

  enabled: boolean;

  email: string;

  avatarId: AvatarId;

  title: string;
};
