import { useCallback, useMemo, useRef } from "react";

import type { GameId } from "../gameCatalog";
import { postAttemptRequest } from "./attempt.service";
import { createAttemptSender, type AttemptSender } from "./attemptSender";
import { collectDeviceInfo } from "./deviceInfo";
import { newId } from "./newId";
import type {
  AttemptBlock,
  AttemptCloseStatus,
  AttemptHandle,
  AttemptRequest,
  LevelReport,
} from "./types";

// Un remitente por juego, a nivel de modulo: sigue trabajando si el
// componente se desmonta (se va a otra pagina) y asi dos instancias del mismo
// juego nunca mandan en paralelo.
// Debe coincidir con MAX_BATCH de api/game-attempts/[gameId].ts.
const BATCH_SIZE = 100;

const senders = new Map<GameId, AttemptSender<AttemptRequest>>();

function getSender(gameId: GameId): AttemptSender<AttemptRequest> {
  let sender = senders.get(gameId);

  if (!sender) {
    sender = createAttemptSender<AttemptRequest>((body) =>
      postAttemptRequest(gameId, body),
    );
    senders.set(gameId, sender);
  }

  return sender;
}

/**
 * Lleva el registro de la partida en curso: su identificador (que viaja
 * dentro del avance guardado, para que al retomar desde otro equipo siga
 * siendo la misma partida) y el envio de cada resultado a la base.
 *
 * Mandar un resultado es idempotente: si se reenvia lo mismo no se duplica.
 * Por eso al retomar se vuelve a mandar todo lo que el avance trae
 * (`syncResults`): lo que no hubiera llegado antes llega ahora.
 */
export function useGameAttempt(gameId: GameId, contentVersion: string) {
  const attemptRef = useRef<AttemptHandle | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const sessionId = useCallback((): string => {
    if (sessionIdRef.current === null) sessionIdRef.current = newId();

    return sessionIdRef.current;
  }, []);

  const block = useCallback((): AttemptBlock | null => {
    const attempt = attemptRef.current;

    if (!attempt) return null;

    return {
      ...attempt,
      contentVersion,
      sessionId: sessionId(),
      device: collectDeviceInfo(),
    };
  }, [contentVersion, sessionId]);

  /** Partida nueva. */
  const begin = useCallback((): AttemptHandle => {
    const handle: AttemptHandle = {
      attemptId: newId(),
      startedAt: new Date().toISOString(),
    };

    attemptRef.current = handle;

    return handle;
  }, []);

  /** Retoma la partida guardada; si es antigua y no traia identificador, abre una. */
  const adopt = useCallback(
    (saved: Partial<AttemptHandle> | null | undefined): AttemptHandle => {
      if (saved?.attemptId) {
        const handle: AttemptHandle = {
          attemptId: saved.attemptId,
          startedAt: saved.startedAt ?? new Date().toISOString(),
        };

        attemptRef.current = handle;

        return handle;
      }

      return begin();
    },
    [begin],
  );

  const current = useCallback((): AttemptHandle | null => attemptRef.current, []);

  const reportLevel = useCallback(
    (result: LevelReport): Promise<boolean> => {
      const attempt = block();

      if (!attempt) return Promise.resolve(false);

      return getSender(gameId).send({ type: "level", attempt, result });
    },
    [block, gameId],
  );

  /**
   * Manda varios resultados en un solo mensaje (con 12 niveles, doce
   * mensajes seguidos tardaban casi un minuto con la latencia real). Si se
   * pasa `status`, el mismo mensaje cierra el intento.
   */
  const syncResults = useCallback(
    async (
      results: LevelReport[],
      status?: AttemptCloseStatus,
    ): Promise<boolean> => {
      const attempt = block();

      if (!attempt) return false;
      if (results.length === 0 && !status) return true;

      // El servidor acepta hasta MAX_BATCH por mensaje.
      const chunks: LevelReport[][] = [];

      for (let i = 0; i < results.length; i += BATCH_SIZE) {
        chunks.push(results.slice(i, i + BATCH_SIZE));
      }

      if (chunks.length === 0) chunks.push([]);

      const outcomes = await Promise.all(
        chunks.map((chunk, i) =>
          getSender(gameId).send({
            type: "batch",
            attempt,
            results: chunk,
            // El cierre va en el ultimo mensaje, cuando ya salieron los demas.
            ...(status && i === chunks.length - 1 ? { status } : {}),
          }),
        ),
      );

      return outcomes.every(Boolean);
    },
    [block, gameId],
  );

  const closeAttempt = useCallback(
    (status: AttemptCloseStatus): Promise<boolean> => {
      const attempt = block();

      if (!attempt) return Promise.resolve(false);

      return getSender(gameId).send({ type: "close", attempt, status });
    },
    [block, gameId],
  );

  return useMemo(
    () => ({ begin, adopt, current, reportLevel, syncResults, closeAttempt }),
    [begin, adopt, current, reportLevel, syncResults, closeAttempt],
  );
}
