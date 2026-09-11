import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export type AdminDocument = {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  enabled: boolean;
  email?: string;
  avatarId: string;
};

const adminSchema = new Schema<AdminDocument>({
  rut: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  paternalLastName: { type: String, required: true },
  maternalLastName: { type: String, required: true },
  enabled: { type: Boolean, required: true, default: true },
  email: String,
  avatarId: { type: String, required: true, default: "panda" },
});

export const Admin =
  models.Admin || model<AdminDocument>("Admin", adminSchema);