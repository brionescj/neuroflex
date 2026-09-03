import { beforeEach, describe, expect, it, vi } from "vitest";

describe("adminRepository.updateContact", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("muta el email y avatarId del administrador en el datasource", async () => {
    const { adminRepository } = await import("@/repositories");
    const { admins } = await import("@/data");

    const rut = "11111111-1";

    const updated = await adminRepository.updateContact(rut, {
      email: "cristian.nuevo@uvm.cl",
      avatarId: "dog",
    });

    expect(updated?.email).toBe("cristian.nuevo@uvm.cl");
    expect(updated?.avatarId).toBe("dog");

    const persisted = admins.find((admin) => admin.rut === rut);

    expect(persisted?.email).toBe("cristian.nuevo@uvm.cl");
    expect(persisted?.avatarId).toBe("dog");
  });

  it("devuelve null si el rut no esta en la nomina", async () => {
    const { adminRepository } = await import("@/repositories");

    const updated = await adminRepository.updateContact("99999999-9", {
      email: "nadie@uvm.cl",
      avatarId: "cat",
    });

    expect(updated).toBeNull();
  });
});
