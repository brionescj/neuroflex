import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearTabMemory, flushTabMemory, persistTabMemory, readTabMemory } from "./tabMemory";

function fakeStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => void data.set(key, value),
  } as Storage;
}

describe("tabMemory", () => {
  let store: Storage;

  beforeEach(() => {
    vi.useFakeTimers();
    store = fakeStorage();
    // Con las claves como propiedades, Object.keys las encuentra como en un navegador.
    const proxy = new Proxy(store, {
      ownKeys: () => Array.from({ length: store.length }, (_, i) => store.key(i) as string),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    });

    vi.stubGlobal("sessionStorage", proxy);
  });

  afterEach(() => {
    clearTabMemory();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("junta varios cambios seguidos en una sola escritura y guarda el último", () => {
    persistTabMemory("a", () => ({ q: "so" }));
    persistTabMemory("a", () => ({ q: "soto" }));

    expect(readTabMemory("a")).toBeNull();

    vi.advanceTimersByTime(300);

    expect(readTabMemory("a")).toEqual({ q: "soto" });
  });

  it("flush escribe de inmediato (al apagarse la pantalla)", () => {
    persistTabMemory("a", () => ({ ok: true }));
    flushTabMemory();

    expect(readTabMemory("a")).toEqual({ ok: true });
  });

  it("vaciar borra lo guardado y lo pendiente, pero no lo ajeno", () => {
    store.setItem("otra-cosa", "1");
    persistTabMemory("a", () => 1);
    flushTabMemory();
    persistTabMemory("b", () => 2);
    clearTabMemory();
    vi.advanceTimersByTime(1000);

    expect(readTabMemory("a")).toBeNull();
    expect(readTabMemory("b")).toBeNull();
    expect(store.getItem("otra-cosa")).toBe("1");
  });

  it("un valor guardado que no es JSON se ignora", () => {
    store.setItem("neuroflex:vista:x", "{roto");

    expect(readTabMemory("x")).toBeNull();
  });

  it("si el navegador no deja usar sessionStorage no falla", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
    });

    persistTabMemory("a", () => 1);

    expect(() => flushTabMemory()).not.toThrow();
    expect(readTabMemory("a")).toBeNull();
    expect(() => clearTabMemory()).not.toThrow();
  });
});
