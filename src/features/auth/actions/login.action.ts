import { loginService, type LoginPayload } from "../services/login.service";

export async function loginAction(payload: LoginPayload) {
  return loginService(payload);
}
