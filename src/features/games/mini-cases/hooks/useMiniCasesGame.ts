import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useGameProgress } from "../../hooks/useGameProgress";
import { buildProgressSnapshot, buildResumePlan, type ResumePlan } from "../resume";
import {
  fetchMiniCases,
  submitMiniCaseOrder,
} from "../services/miniCases.service";
import type { ApiMiniCase, MiniCaseResult } from "../types";

/**
 * El documento fuente especifica 10 segundos de lectura base para cada
 * caso ("Fase 1 (Lectura Base - 10 segundos)", repetido en cada uno de los
 * 10 mini casos). No es un valor arbitrario: no subirlo sin volver a
 * confirmar contra el documento.
 */
export const READING_MS = 10_000;

const FADING_MS = 1_500;
export const DISTRACTOR_MS = 3_000;

type CasesStatus = "loading" | "loaded" | "error";

type GamePhase =
  | "idle"
  | "reading"
  | "fading"
  | "distractors"
  | "twist"
  | "ordering"
  | "submitting"
  | "submit-error"
  | "result"
  | "finished";

export function useMiniCasesGame() {
  const [casesStatus, setCasesStatus] = useState<CasesStatus>("loading");
  const [cases, setCases] = useState<ApiMiniCase[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phase, setPhase] = useState<GamePhase>("idle");
  const [caseIndex, setCaseIndex] = useState(0);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [results, setResults] = useState<MiniCaseResult[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const orderingStartRef = useRef<number | null>(null);

  // Numero de la ultima peticion del banco. React en desarrollo monta dos
  // veces (y un reintento lanza otra): el servidor baraja en CADA
  // respuesta, asi que solo la ultima puede fijar los casos. Como el estado
  // "loaded" solo llega con esa respuesta, no se puede empezar ni reanudar
  // antes de que los casos queden fijos, y despues ya nada los reemplaza.
  const bankRequestRef = useRef(0);

  const progress = useGameProgress("mini-cases");
  const {
    status: progressStatus,
    error: progressError,
    saved: savedProgress,
    reload: reloadProgress,
    save: saveProgress,
    clear: clearProgress,
  } = progress;

  const currentCase = cases[caseIndex];

  const loadCases = useCallback(() => {
    setCasesStatus("loading");
    setLoadError(null);

    const requestId = ++bankRequestRef.current;

    fetchMiniCases().then((response) => {
      if (requestId !== bankRequestRef.current) return;

      if (!response.success) {
        setLoadError(response.message);
        setCasesStatus("error");
        return;
      }

      if (response.data.length === 0) {
        setLoadError("El banco de mini casos esta vacio.");
        setCasesStatus("error");
        return;
      }

      setCases(response.data);
      setCasesStatus("loaded");
    });
  }, []);

  // Trae el banco al montar. El orden que devuelve el servidor (casos y
  // opciones) viene mezclado en cada respuesta; se guarda en estado y no se
  // vuelve a pedir durante la partida (ver bankRequestRef).
  useEffect(() => {
    loadCases();
  }, [loadCases]);

  // Si hay un avance guardado y sigue siendo coherente con el banco actual,
  // aqui queda el plan para retomarlo exactamente donde se dejo.
  const resumePlan: ResumePlan | null = useMemo(() => {
    if (casesStatus !== "loaded" || progressStatus !== "ready") return null;
    if (!savedProgress) return null;
    return buildResumePlan(cases, savedProgress);
  }, [casesStatus, progressStatus, savedProgress, cases]);

  // Un avance guardado que ya no cuadra (caso retirado, opciones editadas,
  // dato corrupto) se descarta para no dejar al alumno bloqueado con algo
  // imposible de reanudar. Solo se evalua en "idle": una partida en curso
  // nunca debe borrarse por esto.
  useEffect(() => {
    if (phase !== "idle") return;
    if (casesStatus !== "loaded" || progressStatus !== "ready") return;

    if (savedProgress && !resumePlan) {
      clearProgress();
    }
  }, [phase, casesStatus, progressStatus, savedProgress, resumePlan, clearProgress]);

  const applySnapshot = useCallback((plan: ResumePlan) => {
    setCases(plan.orderedCases);
    setCaseIndex(plan.snapshot.caseIndex);
    setResults(plan.snapshot.results);
    setSelectedOptionIds([]);
    setSubmitError(null);
    setPhase(plan.snapshot.phase);
  }, []);

  // Una partida ya terminada se muestra sola (el resumen final no necesita
  // que el alumno haga nada). Una a medias espera a que apriete "Continuar":
  // ese clic es el gesto que el navegador exige para permitir el sonido, y
  // evita que los 10 s de lectura corran antes de que el alumno este mirando.
  useEffect(() => {
    if (phase !== "idle") return;
    if (resumePlan?.snapshot.phase !== "finished") return;

    applySnapshot(resumePlan);
  }, [phase, resumePlan, applySnapshot]);

  const hasResumable =
    phase === "idle" &&
    resumePlan !== null &&
    resumePlan.snapshot.phase !== "finished";

  // No se puede empezar de cero mientras exista un avance guardado, ni
  // mientras no se sepa si existe: si no, empezar de nuevo seria la forma
  // de "rehacer" casos ya respondidos.
  const canStart =
    casesStatus === "loaded" && progressStatus === "ready" && resumePlan === null;

  const isGameInProgress =
    (phase !== "idle" && phase !== "finished") || hasResumable;

  const start = useCallback(() => {
    if (!canStart) return;

    setCaseIndex(0);
    setResults([]);
    setSelectedOptionIds([]);
    setSubmitError(null);
    setPhase("reading");
  }, [canStart]);

  const resume = useCallback(() => {
    if (resumePlan) applySnapshot(resumePlan);
  }, [resumePlan, applySnapshot]);

  // Terminada la partida, "volver a jugar" borra el avance guardado y trae
  // un banco nuevo (otro orden de casos y de opciones).
  const returnToStart = useCallback(() => {
    clearProgress();
    setPhase("idle");
    loadCases();
  }, [clearProgress, loadCases]);

  const retryLoad = useCallback(() => {
    if (casesStatus === "error") loadCases();
    if (progressStatus === "error") reloadProgress();
  }, [casesStatus, progressStatus, loadCases, reloadProgress]);

  // Puntos de control: inicio de cada caso, su resultado y el final. Las
  // fases intermedias (lectura, distractor, giro, ordenamiento) no se
  // guardan: reanudar siempre vuelve al inicio del caso en curso.
  useEffect(() => {
    if (casesStatus !== "loaded") return;
    if (phase !== "reading" && phase !== "result" && phase !== "finished") {
      return;
    }

    saveProgress(buildProgressSnapshot(cases, caseIndex, phase, results));
  }, [casesStatus, phase, caseIndex, cases, results, saveProgress]);

  // Fase 1: lectura base. Duracion fija, sin contador numerico visible
  // (la barra de progreso ya comunica el tiempo restante sin presionar
  // al estudiante con un numero de segundos bajando).
  useEffect(() => {
    if (phase !== "reading") return;

    const timer = setTimeout(() => setPhase("fading"), READING_MS);

    return () => clearTimeout(timer);
  }, [phase, caseIndex]);

  // Fase 2: el texto desaparece brevemente para forzar la retencion.
  useEffect(() => {
    if (phase !== "fading") return;

    const timer = setTimeout(() => setPhase("distractors"), FADING_MS);

    return () => clearTimeout(timer);
  }, [phase]);

  // Fase 3: el texto NO vuelve a aparecer. En su lugar, un distractor
  // visual+sonoro ocupa la pantalla por un tiempo fijo y despues avanza
  // solo al giro de contexto, sin boton.
  useEffect(() => {
    if (phase !== "distractors") return;

    const timer = setTimeout(() => setPhase("twist"), DISTRACTOR_MS);

    return () => clearTimeout(timer);
  }, [phase]);

  const proceedToOrdering = useCallback(() => {
    setSelectedOptionIds([]);
    setSubmitError(null);
    orderingStartRef.current = Date.now();
    setPhase("ordering");
  }, []);

  // Alterna la seleccion de una opcion: si ya estaba elegida, la saca del
  // orden (y las que quedan se renumeran solas, porque el numero de paso
  // es simplemente su posicion en el arreglo); si no estaba elegida, se
  // agrega al final del orden actual.
  const toggleOption = useCallback(
    (optionId: string) => {
      if (phase !== "ordering" || !currentCase) return;

      setSelectedOptionIds((prev) => {
        if (prev.includes(optionId)) {
          return prev.filter((id) => id !== optionId);
        }

        if (prev.length >= currentCase.options.length) {
          return prev;
        }

        return [...prev, optionId];
      });
    },
    [phase, currentCase],
  );

  // Detecta que se completaron las 4 selecciones y pasa a "submitting".
  // Solo mira la fase "ordering" a proposito: si un envio fallo, la fase
  // pasa a "submit-error" (no vuelve a "ordering"), asi este efecto no
  // reintenta solo en loop con el mismo arreglo ya completo.
  useEffect(() => {
    if (phase !== "ordering" || !currentCase) return;
    if (selectedOptionIds.length === currentCase.options.length) {
      setPhase("submitting");
    }
  }, [selectedOptionIds, phase, currentCase]);

  // Ejecuta el envio real cada vez que se entra a "submitting" (ya sea
  // la primera vez o por un reintento explicito del usuario).
  useEffect(() => {
    if (phase !== "submitting" || !currentCase) return;

    let cancelled = false;

    const decisionTimeMs = orderingStartRef.current
      ? Date.now() - orderingStartRef.current
      : 0;

    submitMiniCaseOrder(currentCase.caseKey, selectedOptionIds).then(
      (response) => {
        if (cancelled) return;

        if (!response.success) {
          setSubmitError(response.message);
          setPhase("submit-error");
          return;
        }

        setSubmitError(null);
        setResults((prev) => [...prev, { ...response.data, decisionTimeMs }]);
        setPhase("result");
      },
    );

    return () => {
      cancelled = true;
    };
  }, [phase, currentCase, selectedOptionIds]);

  const retrySubmit = useCallback(() => {
    setPhase("submitting");
  }, []);

  const nextCase = useCallback(() => {
    const nextIndex = caseIndex + 1;

    if (nextIndex >= cases.length) {
      setPhase("finished");
      return;
    }

    setCaseIndex(nextIndex);
    setSelectedOptionIds([]);
    setSubmitError(null);
    setPhase("reading");
  }, [caseIndex, cases.length]);

  return {
    casesStatus,
    loadError,
    progressStatus,
    progressError,
    retryLoad,
    canStart,
    hasResumable,
    isGameInProgress,
    resumeExercise: resumePlan ? resumePlan.snapshot.caseIndex + 1 : null,
    totalCases: cases.length,
    phase,
    caseIndex,
    currentCase,
    selectedOptionIds,
    results,
    submitError,
    start,
    resume,
    returnToStart,
    proceedToOrdering,
    toggleOption,
    retrySubmit,
    nextCase,
  };
}
