import axios from "axios";

import type { SignIn } from "../schemas/signin.schema";

export async function signIn(payload: SignIn) {
  const { data } = await axios.post(
    "/api/auth/login",
    payload
  );

  return data;
}