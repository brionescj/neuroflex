import { useMemo, useState, type ReactNode } from "react";

import { GameLockContext } from "./gameLock.context";

type GameLockProviderProps = {
  children: ReactNode;
};

export function GameLockProvider({ children }: GameLockProviderProps) {
  const [isLocked, setLocked] = useState(false);

  const value = useMemo(() => ({ isLocked, setLocked }), [isLocked]);

  return (
    <GameLockContext.Provider value={value}>
      {children}
    </GameLockContext.Provider>
  );
}
