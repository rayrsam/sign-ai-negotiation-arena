import { useCallback, useEffect, useState } from "react";
import type { SessionReport, TableState } from "../../../shared/table/types";
import { loadReport, loadTable } from "@/table/services/api";
import { rememberTable } from "@/table/services/history";

/** Loads a finished table and its evaluation (the server builds it once and caches it). */
export function useReport(id: string | null) {
  const [state, setState] = useState<TableState | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setError(null);
    loadTable(id, controller.signal)
      .then((table) => {
        setState(table);
        if (table.status === "active" || table.status === "aborted") return;
        return loadReport(id, controller.signal).then(({ state: finished, report: ready }) => {
          setState(finished);
          setReport(ready);
          rememberTable(finished, ready);
        });
      })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Отчёт недоступен"); });
    return () => controller.abort();
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { state, report, error, retry };
}

/** Steps given away: conditional ones were exchanged for a counter-step. */
export function concessionSteps(state: TableState) {
  const steps = (conditional: boolean) => state.concessions.filter((item) => item.conditional === conditional).reduce((total, item) => total + (item.to - item.from), 0);
  return { conditional: steps(true), free: steps(false), used: state.tokensTotal - state.tokensLeft };
}
