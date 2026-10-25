import { useCallback, useEffect, useState } from "react";

import { loadStudentScores } from "../services/studentScores.service";
import type { StudentScores } from "../types";

export type StudentScoresStatus = "loading" | "ready" | "error";

/** Pide las puntuaciones cada vez que se abre la pantalla: siempre reflejan la ultima partida. */
export function useStudentScores() {
  const [status, setStatus] = useState<StudentScoresStatus>("loading");
  const [scores, setScores] = useState<StudentScores | null>(null);

  const start = useCallback(() => {
    let cancelled = false;

    setStatus("loading");

    loadStudentScores().then((response) => {
      if (cancelled) return;

      if (!response.success) {
        setStatus("error");
        return;
      }

      setScores(response.data);
      setStatus("ready");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => start(), [start]);

  return { status, scores, reload: start };
}
