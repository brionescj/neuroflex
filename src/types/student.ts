import type { AvatarId } from "@/config/avatars";
import type {
  EntrySemester,
  StudyShift,
} from "./common";

export type Student = {
  rut: string;

  firstName: string;

  paternalLastName: string;

  maternalLastName: string;

  birthDate: string;

  entryYear: number;

  entrySemester: EntrySemester;

  studyShift: StudyShift;

  works: boolean;

  enabled: boolean;

  registered: boolean;

  email: string;

  avatarId: AvatarId;
};