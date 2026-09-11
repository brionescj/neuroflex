import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export type StudentDocument = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  paralelo: 1 | 2 | 3 | 4;
  entryYear: number;
  birthDate?: string;
  studyShift?: "day" | "evening";
  enabled: boolean;
  registered: boolean;
  email?: string;
  celular?: string;
  ciudad?: string;
  region?: string;
  avatarId: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  deletionReason?: string;
};

const studentSchema = new Schema<StudentDocument>({
  rut: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  paternalLastName: { type: String, required: true },
  maternalLastName: { type: String, required: true },
  paralelo: { type: Number, enum: [1, 2, 3, 4], required: true },
  entryYear: {
    type: Number,
    required: true,
    immutable: true,
    default: () => new Date().getFullYear(),
  },
  birthDate: String,
  studyShift: { type: String, enum: ["day", "evening"] },
  enabled: { type: Boolean, required: true, default: true },
  registered: { type: Boolean, required: true, default: false },
  email: String,
  celular: String,
  ciudad: String,
  region: String,
  avatarId: { type: String, required: true, default: "cat" },
  isDeleted: { type: Boolean, required: true, default: false },
  deletedAt: Date,
  deletedBy: String,
  deletionReason: String,
});

export const Student =
  models.Student || model<StudentDocument>("Student", studentSchema);