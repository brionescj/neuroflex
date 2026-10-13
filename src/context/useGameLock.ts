import { useContext } from "react";

import { GameLockContext, type GameLockContextValue } from "./gameLock.context";

export function useGameLock(): GameLockContextValue {
  return useContext(GameLockContext);
}
