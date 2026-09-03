import {
  updateProfileContact,
  type UpdateContactPayload,
} from "@/services/profile.service";

export async function updateProfileAction(payload: UpdateContactPayload) {
  return updateProfileContact(payload);
}