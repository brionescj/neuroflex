import mongoose from "mongoose";

import { GENDERS, PARALELOS, STUDY_SHIFTS, UNIVERSITIES } from "../studentFields";

const { Schema, model, models } = mongoose;

export type StudentDocument = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  paralelo: (typeof PARALELOS)[number];
  entryYear: number;
  birthDate?: string;
  studyShift?: (typeof STUDY_SHIFTS)[number];
  gender?: (typeof GENDERS)[number];
  university?: (typeof UNIVERSITIES)[number];
  enabled: boolean;
  registered: boolean;
  email?: string;
  celular?: string;
  comuna?: string;
  region?: string;
  avatarId: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  deletionReason?: string;
  /** Un administrador ya llamo al estudiante para que complete su perfil (ausente = falta contactar). */
  contacted?: boolean;
  contactedAt?: Date;
  /** RUT del administrador que lo marco. */
  contactedBy?: string;
};

const studentSchema = new Schema<StudentDocument>({
  rut: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  paternalLastName: { type: String, required: true },
  maternalLastName: { type: String, required: true },
  paralelo: { type: Number, enum: PARALELOS, required: true },
  entryYear: {
    type: Number,
    required: true,
    immutable: true,
    default: () => new Date().getFullYear(),
  },
  birthDate: String,
  studyShift: { type: String, enum: STUDY_SHIFTS },
  gender: { type: String, enum: GENDERS },
  university: { type: String, enum: UNIVERSITIES },
  enabled: { type: Boolean, required: true, default: true },
  registered: { type: Boolean, required: true, default: false },
  email: { type: String, lowercase: true, trim: true },
  celular: String,
  comuna: String,
  region: String,
  avatarId: { type: String, required: true, default: "cat" },
  isDeleted: { type: Boolean, required: true, default: false },
  deletedAt: Date,
  deletedBy: String,
  deletionReason: String,
  contacted: Boolean,
  contactedAt: Date,
  contactedBy: String,
});

export const Student =
  models.Student || model<StudentDocument>("Student", studentSchema);