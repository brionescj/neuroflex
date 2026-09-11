import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export type TeacherDocument = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  enabled: boolean;
  email?: string;
  avatarId: string;
  title?: string;
};

const teacherSchema = new Schema<TeacherDocument>({
  rut: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  paternalLastName: { type: String, required: true },
  maternalLastName: { type: String, required: true },
  enabled: { type: Boolean, required: true, default: true },
  email: String,
  avatarId: { type: String, required: true, default: "dog" },
  title: String,
});

export const Teacher =
  models.Teacher || model<TeacherDocument>("Teacher", teacherSchema);