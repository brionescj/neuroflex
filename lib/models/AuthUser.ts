import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export type AuthUserDocument = {
  rut: string;
  password: string;
  role: "student" | "teacher" | "admin";
  enabled: boolean;
};

const authUserSchema = new Schema<AuthUserDocument>({
  rut: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "teacher", "admin"], required: true },
  enabled: { type: Boolean, required: true, default: true },
});

export const AuthUser =
  models.AuthUser || model<AuthUserDocument>("AuthUser", authUserSchema);