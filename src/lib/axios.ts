import axios from "axios";

import { env } from "@/config/env";
import {
  GAME_LEASE_HEADER,
  GAME_LEASE_LOST_CODE,
  getActiveLease,
  notifyGameLeaseLost,
} from "./gameLease";
import { SESSION_REPLACED_EVENT, setSessionNotice } from "./sessionNotice";

export const api = axios.create({
  baseURL: env.API_URL,
  // 20 s: con una funcion que arranca en frio y una base lenta, 10 s cortaba peticiones que si iban a responder.
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  // Quien abrio el juego en ultimo lugar es el unico que puede guardar (ver gameLease.ts).
  const lease = getActiveLease();

  if (lease) config.headers.set(GAME_LEASE_HEADER, lease);

  return config;
});

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    // Entraron con esta cuenta desde otro dispositivo: esta sesion ya no vale.
    if (status === 401 && code === "session-replaced") {
      setSessionNotice(String(error.response.data.message ?? ""));
      window.dispatchEvent(new Event(SESSION_REPLACED_EVENT));
    }

    // El juego se abrio en otra pestana o dispositivo: esta queda en pausa.
    if (status === 409 && code === GAME_LEASE_LOST_CODE) {
      notifyGameLeaseLost();
    }

    return Promise.reject(error);
  }
);
