import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * En Vercel la API corre como modulo ESM ("type": "module" en package.json) y Node
 * resuelve los imports relativos al pie de la letra: sin extension no encuentra el
 * archivo (`ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/lib/router'`).
 * `tsx`, Vite y vitest lo perdonan, asi que el fallo solo aparece en produccion.
 * Este test lo atrapa antes: todo import relativo de api/ y lib/ lleva extension
 * (`./x.js`; TypeScript lo resuelve al `.ts`).
 */
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(path);

    return entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

const RELATIVE_IMPORT = /(?:from\s+|import\s*\(\s*|import\s+)["'](\.\.?\/[^"']+)["']/g;
const WITH_EXTENSION = /\.(?:js|json|mjs|cjs)$/;

describe("imports relativos del servidor (ESM en Vercel)", () => {
  it("todos llevan extension en api/ y lib/", () => {
    const missing: string[] = [];

    for (const dir of ["api", "lib"]) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        const text = readFileSync(file, "utf8");

        for (const match of text.matchAll(RELATIVE_IMPORT)) {
          if (!WITH_EXTENSION.test(match[1])) {
            missing.push(`${relative(ROOT, file)}: ${match[1]}`);
          }
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
