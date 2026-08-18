import { createContext } from "react";

import type { SessionUser } from "@/types";

export type AuthContextValue = {
  user: SessionUser | null;

  isAuthenticated: boolean;

  isLoading: boolean;

  login: (user: SessionUser) => void;

  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
