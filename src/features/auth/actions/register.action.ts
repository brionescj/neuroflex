import {
  registerService,
  type RegisterPayload,
} from "../services/register.service";

export async function registerAction(payload: RegisterPayload) {
  return registerService(payload);
}
