import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RutInput } from "./RutInput";

describe("RutInput", () => {
  it("no fuerza el teclado numérico: el dígito verificador puede ser «K»", () => {
    const html = renderToStaticMarkup(<RutInput id="rut" value="" onChange={() => {}} />);

    expect(html).not.toMatch(/inputmode="numeric"/i);
    expect(html).not.toMatch(/inputmode="tel"/i);
    expect(html).toMatch(/inputmode="text"/i);
  });

  it("pide mayúsculas y desactiva el autocorrector para escribir la K", () => {
    const html = renderToStaticMarkup(<RutInput id="rut" value="" onChange={() => {}} />);

    expect(html).toMatch(/autocapitalize="characters"/i);
    expect(html).toMatch(/autocorrect="off"/i);
  });
});
