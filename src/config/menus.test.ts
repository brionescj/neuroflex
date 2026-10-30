import { describe, expect, it } from "vitest";

import { ROLE_MENUS } from "./menus";
import { DASHBOARD_BY_ROLE, ROUTES } from "./routes";

describe("ROLE_MENUS", () => {
  it("cada rol empieza por su «Inicio» y no repite rutas", () => {
    for (const role of ["student", "admin"] as const) {
      const paths = ROLE_MENUS[role].map((item) => item.path);

      expect(paths[0]).toBe(DASHBOARD_BY_ROLE[role]);
      expect(new Set(paths).size).toBe(paths.length);
    }
  });

  it("el admin tiene su inicio (la presentación) y, aparte, la carga de datos", () => {
    const admin = ROLE_MENUS.admin.map((item) => [item.label, item.path]);

    expect(admin.slice(0, 2)).toEqual([
      ["Inicio", ROUTES.ADMIN],
      ["Carga de datos", ROUTES.ADMIN_DATA],
    ]);
    expect(ROUTES.ADMIN_DATA).not.toBe(ROUTES.ADMIN);
  });
});
