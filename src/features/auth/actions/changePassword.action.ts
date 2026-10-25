import {
  changePasswordService,
  type ChangePasswordPayload,
} from "../services/changePassword.service";

export async function changePasswordAction(payload: ChangePasswordPayload) {
  return changePasswordService(payload);
}
