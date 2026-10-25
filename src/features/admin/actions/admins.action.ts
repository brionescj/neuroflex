import {
  createAdmin,
  generateAdminPassword,
  listAdmins,
  setAdminEnabled,
  updateAdminNames,
  type CreateAdminPayload,
  type UpdateAdminNamesPayload,
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

export async function updateAdminNamesAction(rut: string, payload: UpdateAdminNamesPayload) {
  return updateAdminNames(rut, payload);
}

export async function generateAdminPasswordAction(rut: string, adminPassword: string) {
  return generateAdminPassword(rut, adminPassword);
}
