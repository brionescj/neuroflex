import { Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { miniCaseImageLabel } from "@/config/miniCaseImages";
import { MiniCaseImage } from "@/features/games/mini-cases/images/MiniCaseImage";
import type { AdminMiniCase } from "@/types";

import { listMiniCasesAction } from "../actions/miniCases.action";
import { MiniCaseForm } from "../components/MiniCaseForm";

/** El numero del caso segun su clave («caso-12» es el 12). */
function caseNumber(caseKey: string): number {
  const found = /(\d+)\s*$/.exec(caseKey);

  return found ? Number(found[1]) : Number.MAX_SAFE_INTEGER;
}

type View = { kind: "list" } | { kind: "new" } | { kind: "edit"; miniCase: AdminMiniCase };

export default function MiniCasesAdminPage() {
  const [cases, setCases] = useState<AdminMiniCase[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "list" });
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");

    const response = await listMiniCasesAction();

    if (!response.success) {
      setError(response.message);
      setStatus("error");
      return;
    }

    setCases([...response.data].sort((a, b) => caseNumber(a.caseKey) - caseNumber(b.caseKey)));
    setError(null);
    setStatus("ready");
  }, []);

  useEffect(() => {
    // Trae el listado al abrir la pagina.
    void load();
  }, [load]);

  function handleSaved(saved: AdminMiniCase) {
    setNotice(`«${saved.title}» quedó guardado.`);
    setView({ kind: "list" });
    void load();
  }

  if (view.kind !== "list") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 text-white">
        <MiniCaseForm
          key={view.kind === "edit" ? view.miniCase.caseKey : "new"}
          initial={view.kind === "edit" ? view.miniCase : undefined}
          onSaved={handleSaved}
          onCancel={() => setView({ kind: "list" })}
        />
      </div>
    );
  }

  const active = cases.filter((c) => c.enabled).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mini casos</h1>

          {status === "ready" && (
            <p className="text-sm text-zinc-400">
              {cases.length} {cases.length === 1 ? "caso" : "casos"} en el banco, {active} en el juego.
            </p>
          )}
        </div>

        <Button onClick={() => setView({ kind: "new" })} className="w-full sm:w-auto">
          <Plus className="size-4" aria-hidden="true" />
          Agregar mini caso
        </Button>
      </div>

      {notice && (
        <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {notice}
        </p>
      )}

      {status === "loading" && <p className="text-sm text-zinc-500">Cargando...</p>}

      {status === "error" && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-rose-400">{error ?? "No se pudo cargar el banco de mini casos."}</p>

          <Button variant="outline" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      )}

      {status === "ready" && (
        <ul className="flex flex-col gap-3">
          {cases.map((miniCase) => (
            <li
              key={miniCase.caseKey}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
            >
              <MiniCaseImage
                imageKey={miniCase.imageKey}
                label={miniCaseImageLabel(miniCase.imageKey ?? "aula")}
                className="aspect-[8/5] w-24 shrink-0 rounded-lg sm:w-32"
              />

              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-500">Caso {caseNumber(miniCase.caseKey)}</p>

                <p className="font-medium leading-snug">{miniCase.title}</p>

                {!miniCase.enabled && <p className="mt-1 text-xs text-amber-300">Retirado del juego</p>}
              </div>

              <Button
                variant="outline"
                size="icon"
                aria-label={`Editar ${miniCase.title}`}
                onClick={() => {
                  setNotice(null);
                  setView({ kind: "edit", miniCase });
                }}
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
