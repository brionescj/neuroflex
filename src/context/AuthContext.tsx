import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { User } from "@/types/user";

interface AuthContextType {
  user: User | null;

  isAuthenticated: boolean;

  login: (user: User) => void;

  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface Props {
  children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(() => {
    const storage = localStorage.getItem("neuroflex-user");

    if (!storage) {
      return null;
    }

    return JSON.parse(storage);
  });

  function login(user: User) {
    localStorage.setItem(
      "neuroflex-user",
      JSON.stringify(user),
    );

    setUser(user);
  }

  function logout() {
    localStorage.removeItem("neuroflex-user");

    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,

      login,

      logout,

      isAuthenticated: !!user,
    }),
    [user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider",
    );
  }

  return context;
}