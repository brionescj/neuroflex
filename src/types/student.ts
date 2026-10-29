import type { AvatarId } from "@/config/avatars";
import type { Gender, StudyShift, University } from "./common";

export type Paralelo = 1 | 2 | 3 | 4 | 5;

export type Student = {
  rut: string;

  firstName: string;

  paternalLastName: string;

  maternalLastName: string;

  paralelo: Paralelo;

  entryYear: number;

  birthDate?: string;

  studyShift?: StudyShift;

  gender?: Gender;

  university?: University;

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