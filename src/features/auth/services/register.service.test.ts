import { beforeEach, describe, expect, it, vi } from "vitest";

describe("registerService", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rechaza un RUT fuera de la nomina", async () => {
    const { registerService } = await import(
      "@/features/auth/services/register.service"
    );

    const result = await registerService({
      rut: "20000003-K",
      password: "Abc12345",
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/no corresponde a un estudiante/i);
  });

  it("rechaza una matricula inactiva", async () => {
    const { registerService } = await import(
      "@/features/auth/services/register.service"
    );

    const result = await registerService({
      rut: "20345678-6",
      password: "Abc12345",
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/matricula no se encuentra activa/i);
  });

  it("rechaza un RUT ya registrado", async () => {
    const { registerService } = await import(
      "@/features/auth/services/register.service"
    );

    const result = await registerService({
      rut: "12345678-5",
      password: "Abc12345",
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/ya posee una cuenta/i);
  });

  it("registra exitosamente a un estudiante habilitado y no registrado", async () => {
    const { registerService } = await import(
      "@/features/auth/services/register.service"
    );

    const result = await registerService({
      rut: "19876543-0",
      password: "Abc12345",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ rut: "19876543-0" });
  });

    it("marca al estudiante como registrado y crea su cuenta", async () => {
    const { registerService } = await import(
      "@/features/auth/services/register.service"
    );
    const { students, authUsers } = await import("@/data");

    const antes = students.find((s) => s.rut === "19876543-0");
    expect(antes?.registered).toBe(false);

    const result = await registerService({
      rut: "19876543-0",
      password: "Abc12345",
    });

    expect(result.success).toBe(true);

    const despues = students.find((s) => s.rut === "19876543-0");
    expect(despues?.registered).toBe(true);
    expect(authUsers.some((u) => u.rut === "19876543-0")).toBe(true);
  });
});
