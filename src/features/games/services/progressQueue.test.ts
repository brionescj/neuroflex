import { describe, expect, it } from "vitest";

import { createProgressQueue } from "./progressQueue";

type Deferred = { label: string; finish: () => void };

/** Operacion que queda "en vuelo" hasta que el test la termina. */
function makeHarness() {
  const started: string[] = [];
  const inflight: Deferred[] = [];
  let maxConcurrent = 0;
  let concurrent = 0;

  function op(label: string, opts?: { fail?: boolean }) {
    return () => {
      started.push(label);
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);

      return new Promise<void>((resolve, reject) => {
        inflight.push({
          label,
          finish: () => {
            concurrent--;
            if (opts?.fail) reject(new Error("falla simulada"));
            else resolve();
          },
        });
      });
    };
  }

  async function finishNext() {
    const next = inflight.shift();
    if (!next) throw new Error("no hay operaciones en vuelo");
    next.finish();
    // deja correr las continuaciones de la cola
    await new Promise((r) => setTimeout(r, 0));
  }

  return { op, started, inflight, finishNext, maxConcurrent: () => maxConcurrent };
}

describe("createProgressQueue", () => {
  it("empieza la primera operacion de inmediato", () => {
    const h = makeHarness();
    const q = createProgressQueue();

    q.enqueue("save", h.op("A"));

    expect(h.started).toEqual(["A"]);
  });

  it("nunca tiene dos operaciones en vuelo a la vez", async () => {
    const h = makeHarness();
    const q = createProgressQueue();

    q.enqueue("save", h.op("A"));
    q.enqueue("clear", h.op("B"));
    q.enqueue("save", h.op("C"));

    expect(h.inflight).toHaveLength(1);

    await h.finishNext();
    await h.finishNext();
    await h.finishNext();

    expect(h.maxConcurrent()).toBe(1);
  });

  it("respeta el orden en que se pidieron, aunque la respuesta tarde", async () => {
    const h = makeHarness();
    const q = createProgressQueue();

    q.enqueue("save", h.op("A"));
    q.enqueue("clear", h.op("B"));
    q.enqueue("save", h.op("C"));

    await h.finishNext();
    await h.finishNext();
    await h.finishNext();

    expect(h.started).toEqual(["A", "B", "C"]);
  });

  it("fusiona los guardados acumulados detras de uno en vuelo: solo sale el ultimo", async () => {
    const h = makeHarness();
    const q = createProgressQueue();

    q.enqueue("save", h.op("A")); // en vuelo
    q.enqueue("save", h.op("B")); // obsoleto: lo reemplaza C
    q.enqueue("save", h.op("C"));

    await h.finishNext();
    await h.finishNext();

    expect(h.started).toEqual(["A", "C"]);
    expect(h.inflight).toHaveLength(0);
  });

  it("no fusiona guardados a traves de un borrado", async () => {
    const h = makeHarness();
    const q = createProgressQueue();

    q.enqueue("save", h.op("A")); // en vuelo
    q.enqueue("save", h.op("B"));
    q.enqueue("clear", h.op("D"));
    q.enqueue("save", h.op("E"));

    await h.finishNext();
    await h.finishNext();
    await h.finishNext();
    await h.finishNext();

    expect(h.started).toEqual(["A", "B", "D", "E"]);
  });

  it("una operacion que falla no detiene la cola", async () => {
    const h = makeHarness();
    const q = createProgressQueue();

    q.enqueue("save", h.op("A", { fail: true }));
    q.enqueue("clear", h.op("B"));

    await h.finishNext(); // A rechaza
    expect(h.started).toEqual(["A", "B"]);

    await h.finishNext();
    expect(h.inflight).toHaveLength(0);
  });

  it("despues de vaciarse, acepta operaciones nuevas", async () => {
    const h = makeHarness();
    const q = createProgressQueue();

    q.enqueue("save", h.op("A"));
    await h.finishNext();

    q.enqueue("save", h.op("B"));
    expect(h.started).toEqual(["A", "B"]);
  });
});
