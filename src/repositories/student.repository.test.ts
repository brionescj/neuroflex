import { beforeEach, describe, expect, it, vi } from "vitest";

describe("studentRepository.updateContact", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("muta el email y avatarId del estudiante en el datasource", async () => {
    const { studentRepository } = await import("@/repositories");
    const { students } = await import("@/data");

    const rut = "19876543-0";

    const updated = await studentRepository.updateContact(rut, {
      email: "maria.nueva@alumnos.uvm.cl",
      avatarId: "fish",
    });

    expect(updated?.email).toBe("maria.nueva@alumnos.uvm.cl");
    expect(updated?.avatarId).toBe("fish");

    const persisted = students.find((student) => student.rut === rut);

    expect(persisted?.email).toBe("maria.nueva@alumnos.uvm.cl");
    expect(persisted?.avatarId).toBe("fish");
  });

  it("devuelve null si el rut no esta en la nomina", async () => {
    const { studentRepository } = await import("@/repositories");

    const updated = await studentRepository.updateContact("99999999-9", {
      email: "nadie@alumnos.uvm.cl",
      avatarId: "cat",
    });

    expect(updated).toBeNull();
  });
});
