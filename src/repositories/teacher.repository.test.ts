import { beforeEach, describe, expect, it, vi } from "vitest";

describe("teacherRepository.updateContact", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("muta el email y avatarId del docente en el datasource", async () => {
    const { teacherRepository } = await import("@/repositories");
    const { teachers } = await import("@/data");

    const rut = "33333333-3";

    const updated = await teacherRepository.updateContact(rut, {
      email: "patricia.nueva@uvm.cl",
      avatarId: "turtle",
    });

    expect(updated?.email).toBe("patricia.nueva@uvm.cl");
    expect(updated?.avatarId).toBe("turtle");

    const persisted = teachers.find((teacher) => teacher.rut === rut);

    expect(persisted?.email).toBe("patricia.nueva@uvm.cl");
    expect(persisted?.avatarId).toBe("turtle");
  });

  it("devuelve null si el rut no esta en la nomina", async () => {
    const { teacherRepository } = await import("@/repositories");

    const updated = await teacherRepository.updateContact("99999999-9", {
      email: "nadie@uvm.cl",
      avatarId: "cat",
    });

    expect(updated).toBeNull();
  });
});
