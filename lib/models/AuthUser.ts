import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export type AuthUserDocument = {
  rut: string;
  password: string;
  role: "student" | "admin";
  enabled: boolean;
  /** Solo estudiantes: identificador de la unica sesion vigente. Un inicio de sesion nuevo lo reemplaza. */
  sessionId?: string;
};

const authUserSchema = new Schema<AuthUserDocument>({
  rut: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "admin"], required: true },
  enabled: { type: Boolean, required: true, default: true },
  sessionId: { type: String },
});

export const AuthUser =
  models.AuthUser || model<AuthUserDocument>("AuthUser", authUserSchema);