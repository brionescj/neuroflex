import { createContext } from "react";

export type GameLockContextValue = {
  /** true mientras hay una partida en curso: la navegacion de la app se inhabilita. */
  isLocked: boolean;

  setLocked: (locked: boolean) => void;
};

// Valor por defecto "desbloqueado" a proposito: asi un componente que lea
// el contexto fuera de DashboardLayout (por ejemplo LogoutButton) no se
// rompe, solo se comporta como siempre.
export const GameLockContext = createContext<GameLockContextValue>({
  isLocked: false,
  setLocked: () => {},
});
