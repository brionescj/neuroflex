import type { AvatarId } from "@/config/avatars";
import type { StudyShift } from "./common";

export type Paralelo = 1 | 2 | 3 | 4;

export type Student = {
  rut: string;

  firstName: string;

  paternalLastName: string;

  maternalLastName: string;

  paralelo: Paralelo;

  entryYear: number;

  birthDate?: string;

  studyShift?: StudyShift;

  enabled: boolean;

  registered: boolean;

  email?: string;

  celular?: string;

  ciudad?: string;

  region?: string;

  avatarId: AvatarId;

  isDeleted: boolean;

  deletedAt?: string;

  deletedBy?: string;

  deletionReason?: string;
};