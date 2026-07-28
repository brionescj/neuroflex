import axios from "axios";

import { env } from "@/config/env";

export const api = axios.create({
  baseURL: env.API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  // Aquí agregaremos el JWT cuando exista.

  return config;
});

api.interceptors.response.use(
  (response) => response,

  (error) => {
    return Promise.reject(error);
  }
);