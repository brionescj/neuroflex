import { describe, expect, it } from "vitest";

import { createAttemptSender } from "./attemptSender";
import type { SendOutcome } from "./types";

const noSleep = () => Promise.resolve();

describe("createAttemptSender", () => {
  it("devuelve true cuando el servidor acepta", async () => {
    const sender = createAttemptSender<string>(async () => "ok", [1, 1], noSleep);

    expect(await sender.send("a")).toBe(true);
  });

  it("reintenta los fallos transitorios hasta que funciona", async () => {
    const outcomes: SendOutcome[] = ["retry", "retry", "ok"];
    let calls = 0;

    const sender = createAttemptSender<string>(
      async () => outcomes[calls++] ?? "ok",
      [1, 1, 1],
      noSleep,
    );

    expect(await sender.send("a")).toBe(true);
    expect(calls).toBe(3);
  });

  it("se rinde cuando se acaban los reintentos", async () => {
    let calls = 0;

    const sender = createAttemptSender<string>(
      async () => {
        calls++;
        return "retry";
      },
      [1, 1],
      noSleep,
    );

    expect(await sender.send("a")).toBe(false);
    // intento inicial + 2 reintentos
    expect(calls).toBe(3);
  });

  it("no reintenta lo que el servidor rechazo", async () => {
    let calls = 0;

    const sender = createAttemptSender<string>(
      async () => {
        calls++;
        return "rejected";
      },
      [1, 1],
      noSleep,
    );

    expect(await sender.send("a")).toBe(false);
    expect(calls).toBe(1);
  });

  it("una excepcion cuenta como fallo transitorio", async () => {
    let calls = 0;

    const sender = createAttemptSender<string>(
      async () => {
        calls++;
        if (calls === 1) throw new Error("red");
        return "ok";
      },
      [1],
      noSleep,
    );

    expect(await sender.send("a")).toBe(true);
  });

  it("los envios salen de a uno y en el orden pedido", async () => {
    const log: string[] = [];
    let active = 0;
    let maxActive = 0;

    const sender = createAttemptSender<string>(
      async (body) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, body === "a" ? 20 : 1));
        log.push(body);
        active--;
        return "ok";
      },
      [],
      noSleep,
    );

    const results = await Promise.all([
      sender.send("a"),
      sender.send("b"),
      sender.send("c"),
    ]);

    expect(results).toEqual([true, true, true]);
    expect(log).toEqual(["a", "b", "c"]);
    expect(maxActive).toBe(1);
  });

  it("un envio fallido no frena a los siguientes", async () => {
    const sender = createAttemptSender<string>(
      async (body) => (body === "a" ? "rejected" : "ok"),
      [],
      noSleep,
    );

    const first = sender.send("a");
    const second = sender.send("b");

    expect(await first).toBe(false);
    expect(await second).toBe(true);
  });

  it("si un envio se rinde, los que esperaban en cola no reintentan", async () => {
    let calls = 0;

    const sender = createAttemptSender<string>(
      async () => {
        calls++;
        return "retry";
      },
      [1, 1],
      noSleep,
    );

    const results = await Promise.all([
      sender.send("a"),
      sender.send("b"),
      sender.send("c"),
    ]);

    expect(results).toEqual([false, false, false]);
    // "a": intento + 2 reintentos; "b" y "c": un intento cada uno.
    expect(calls).toBe(5);
  });

  it("un envio posterior a la caida vuelve a reintentar", async () => {
    let calls = 0;
    const outcomes: SendOutcome[] = ["retry", "retry", "retry", "retry", "ok"];

    const sender = createAttemptSender<string>(
      async () => outcomes[calls++] ?? "ok",
      [1, 1],
      noSleep,
    );

    expect(await sender.send("a")).toBe(false);
    // Encolado despues de la caida: tiene sus reintentos completos.
    expect(await sender.send("b")).toBe(true);
    expect(calls).toBe(5);
  });
});
