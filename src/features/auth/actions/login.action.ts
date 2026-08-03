import { loginService } from "../services/login.service";

interface LoginPayload {
  rut: string;
  password: string;
}

export async function loginAction(
  payload: LoginPayload,
) {
  return loginService(payload);
}