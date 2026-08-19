import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SESSION_KEY, sessionService } from "@/services/session.service";
import type { SessionUser } from "@/types";

function createLocalStorageStub() {
  const store = new Map<string, string>();

  return {
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },

    setItem(key: string, value: string): void {
      store.set(key, value);
    },

    removeItem(key: string): void {
      store.delete(key);
    },
  };
}

const validSession: SessionUser = {
  id: "auth-2",
  rut: "33333333-3",
  role: "teacher",
  displayName: "Patricia Vera",
  avatarId: "dog",
};

describe("sessionService.read", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageStub());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devuelve la sesion cuando fue guardada con el schema actual", () => {
    sessionService.save(validSession);

    expect(sessionService.read()).toEqual(validSession);
  });

  it("limpia la clave y devuelve null si el JSON esta corrupto", () => {
    localStorage.setItem(SESSION_KEY, "{esto-no-es-json");

    expect(sessionService.read()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("limpia la clave y devuelve null si la sesion no tiene avatarId (forma antigua)", () => {
    const legacySession = {
      id: validSession.id,
      rut: validSession.rut,
      role: validSession.role,
      displayName: validSession.displayName,
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(legacySession));

    expect(sessionService.read()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("devuelve null si no hay ninguna clave guardada", () => {
    expect(sessionService.read()).toBeNull();
  });
});
