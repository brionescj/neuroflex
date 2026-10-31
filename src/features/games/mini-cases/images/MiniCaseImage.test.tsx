import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MiniCaseImage } from "./MiniCaseImage";

describe("MiniCaseImage", () => {
  it("en el juego (sin texto alternativo) no lleva título: no sale nada al pasar el mouse", () => {
    const html = renderToStaticMarkup(<MiniCaseImage imageKey="aula" />);

    expect(html).not.toContain("<title");
    expect(html).not.toContain("<desc");
    expect(html).toContain('aria-hidden="true"');
  });

  it("en la administración, con texto alternativo, la imagen se anuncia", () => {
    const html = renderToStaticMarkup(<MiniCaseImage imageKey="aula" label="Un aula" />);

    expect(html).toContain('aria-label="Un aula"');
    expect(html).toContain("<title>Un aula</title>");
  });
});
