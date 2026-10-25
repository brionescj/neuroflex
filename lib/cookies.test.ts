import type { VercelResponse } from "@vercel/node";
import { describe, expect, it } from "vitest";

import { clearSessionCookie, readSessionCookie, setSessionCookie } from "./cookies";

function fakeRes() {
  const headers: Record<string, unknown> = {};
  const res = {
    setHeader(name: string, value: unknown) {
      headers[name] = value;

      return this;
    },
  } as unknown as VercelResponse;

  return { res, headers };
}

describe("cookies de sesion", () => {
  it("al abrir sesion fija la cookie httpOnly y la auxiliar (legible por el navegador)", () => {
    const { res, headers } = fakeRes();

    setSessionCookie(res, "TOKEN", "student");

    const [session, hint] = headers["Set-Cookie"] as string[];

    expect(session).toContain("neuroflex_session=TOKEN");
    expect(session).toContain("HttpOnly");
    expect(hint).toContain("neuroflex_hint=student");
    expect(hint).not.toContain("HttpOnly");
    expect(hint).not.toContain("TOKEN");
  });

  it("al cerrar sesion borra las dos", () => {
    const { res, headers } = fakeRes();

    clearSessionCookie(res);

    const [session, hint] = headers["Set-Cookie"] as string[];

    expect(session).toMatch(/^neuroflex_session=;.*Max-Age=0/);
    expect(hint).toMatch(/^neuroflex_hint=;.*Max-Age=0/);
  });

  it("la cookie auxiliar no se confunde con la de sesion al leer", () => {
    expect(readSessionCookie("neuroflex_hint=1")).toBeNull();
    expect(readSessionCookie("neuroflex_hint=1; neuroflex_session=ABC")).toBe("ABC");
  });
});
