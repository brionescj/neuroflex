import {
  createAdmin,
  listAdmins,
  setAdminEnabled,
  type CreateAdminPayload,
} from "../services/admins.service";

export async function listAdminsAction() {
  return listAdmins();
}

export async function createAdminAction(payload: CreateAdminPayload) {
  return createAdmin(payload);
}

export async function setAdminEnabledAction(rut: string, enabled: boolean) {
  return setAdminEnabled(rut, enabled);
}