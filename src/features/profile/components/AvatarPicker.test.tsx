import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AvatarPicker } from "./AvatarPicker";

describe("AvatarPicker", () => {
  it("fuera de la edición es solo el dibujo: no hay botón para cambiarlo", () => {
    const html = renderToStaticMarkup(<AvatarPicker value="cat" onChange={() => {}} editing={false} />);

    expect(html).not.toContain("<button");
    expect(html).toContain('aria-label="Avatar: Gato"');
  });

  it("al editar hay un botón para cambiarlo, con los avatares aún plegados", () => {
    const html = renderToStaticMarkup(<AvatarPicker value="panda" onChange={() => {}} editing />);

    expect(html).toContain('aria-label="Cambiar avatar (ahora: Panda)"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Avatares disponibles");
  });
});
