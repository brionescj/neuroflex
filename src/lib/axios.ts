import axios from "axios";

import { env } from "@/config/env";

export const api = axios.create({
  baseURL: env.API_URL,
  // 20 s: con una funcion que arranca en frio y una base lenta, 10 s cortaba peticiones que si iban a responder.
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,

  (error) => {
    return Promise.reject(error);
  }
);