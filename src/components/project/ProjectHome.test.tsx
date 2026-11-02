import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ProjectHome } from "./ProjectHome";

function render() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <ProjectHome action={{ label: "Ir", to: "/" }} />
    </MemoryRouter>,
  );
}

describe("ProjectHome", () => {
  it("muestra el grado académico bajo el cargo de cada integrante del equipo", () => {
    const html = render();

    expect(html).toMatch(
      /Investigadora responsable del proyecto<\/span><span[^>]*>Magíster en Neurociencia Aplicada a la Educación</,
    );
    expect(html).toMatch(/Coinvestigador<\/span><span[^>]*>Doctor en Educación</);
  });
});
