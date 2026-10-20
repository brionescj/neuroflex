import { describe, expect, it } from "vitest";

import { createActiveClock, IDLE_LIMIT_MS } from "./activeClock";

function setup(idleMs?: number) {
  let t = 1_000_000;
  const clock = createActiveClock(() => t, idleMs);

  return {
    clock,
    advance(ms: number) {
      t += ms;
    },
  };
}

describe("createActiveClock", () => {
  it("el umbral por defecto es de 80 segundos", () => {
    expect(IDLE_LIMIT_MS).toBe(80_000);
  });

  it("sin inactividad el neto es igual al bruto", () => {
    const { clock, advance } = setup();

    clock.start();
    advance(30_000);
    clock.touch();
    advance(30_000);

    expect(clock.read()).toEqual({ grossMs: 60_000, netMs: 60_000 });
  });

  it("no cuenta nada mientras esta detenido", () => {
    const { clock, advance } = setup();

    advance(50_000);
    expect(clock.read()).toEqual({ grossMs: 0, netMs: 0 });

    clock.start();
    advance(10_000);
    clock.pause();
    advance(500_000);

    expect(clock.read()).toEqual({ grossMs: 10_000, netMs: 10_000 });
  });

  it("descuenta solo lo que pasa de 80 s sin tocar", () => {
    const { clock, advance } = setup();

    clock.start();
    advance(100_000); // 20 s de exceso
    clock.touch();
    advance(5_000);

    expect(clock.read()).toEqual({ grossMs: 105_000, netMs: 85_000 });
  });

  it("una pausa exactamente de 80 s no se descuenta", () => {
    const { clock, advance } = setup();

    clock.start();
    advance(80_000);
    clock.touch();

    expect(clock.read()).toEqual({ grossMs: 80_000, netMs: 80_000 });
  });

  it("la inactividad en curso ya se descuenta al leer, sin esperar un toque", () => {
    const { clock, advance } = setup();

    clock.start();
    advance(200_000);

    expect(clock.read()).toEqual({ grossMs: 200_000, netMs: 80_000 });
  });

  it("al pausar cierra la inactividad pendiente", () => {
    const { clock, advance } = setup();

    clock.start();
    advance(120_000);
    clock.pause();
    advance(60_000);

    expect(clock.read()).toEqual({ grossMs: 120_000, netMs: 80_000 });
  });

  it("al volver de una pausa la cuenta de inactividad parte de cero", () => {
    const { clock, advance } = setup();

    clock.start();
    advance(60_000);
    clock.pause();
    advance(1_000_000);
    clock.start();
    advance(60_000);

    expect(clock.read()).toEqual({ grossMs: 120_000, netMs: 120_000 });
  });

  it("acumula varios descuentos", () => {
    const { clock, advance } = setup();

    clock.start();
    advance(100_000);
    clock.touch(); // -20 s
    advance(90_000);
    clock.touch(); // -10 s

    expect(clock.read()).toEqual({ grossMs: 190_000, netMs: 160_000 });
  });

  it("restore continua desde lo guardado y conserva el descuento", () => {
    const { clock, advance } = setup();

    clock.restore(100_000, 70_000);
    expect(clock.read()).toEqual({ grossMs: 100_000, netMs: 70_000 });

    clock.start();
    advance(10_000);

    expect(clock.read()).toEqual({ grossMs: 110_000, netMs: 80_000 });
  });

  it("restore ignora un neto mayor que el bruto", () => {
    const { clock } = setup();

    clock.restore(50_000, 90_000);

    expect(clock.read()).toEqual({ grossMs: 50_000, netMs: 50_000 });
  });

  it("reset deja todo en cero", () => {
    const { clock, advance } = setup();

    clock.start();
    advance(10_000);
    clock.reset();

    expect(clock.read()).toEqual({ grossMs: 0, netMs: 0 });
    expect(clock.isRunning()).toBe(false);
  });

  it("start repetido no reinicia el tramo", () => {
    const { clock, advance } = setup();

    clock.start();
    advance(10_000);
    clock.start();
    advance(10_000);

    expect(clock.read().grossMs).toBe(20_000);
  });

  it("touch con el reloj detenido no hace nada", () => {
    const { clock, advance } = setup();

    advance(500_000);
    clock.touch();

    expect(clock.read()).toEqual({ grossMs: 0, netMs: 0 });
  });
});
