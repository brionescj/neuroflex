import type { SaveMiniCasePayload } from "@/types";

import { listMiniCases, saveMiniCase } from "../services/miniCases.service";

export async function listMiniCasesAction() {
  return listMiniCases();
}

export async function saveMiniCaseAction(payload: SaveMiniCasePayload) {
  return saveMiniCase(payload);
}
