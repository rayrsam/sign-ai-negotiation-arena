import { useCallback, useEffect, useRef, useState } from "react";
import { getAttempt, getLatestAttempt, saveAttempt } from "@/services/attempt-storage";
import { analyzeAttempt } from "@/services/reporting-api";
import type { StoredAttempt } from "@/types/reporting";

export function useReportingAttempt(enabled = true) {
  const requestedId = new URLSearchParams(window.location.search).get("attempt");
  const [attempt, setAttempt] = useState<StoredAttempt | null>(() =>
    enabled ? (requestedId ? getAttempt(requestedId) : getLatestAttempt()) : null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const runAnalysis = useCallback(async (current: StoredAttempt) => {
    if (startedRef.current || current.analysis) return;
    startedRef.current = true;
    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzeAttempt(current);
      const addedEvents = analysis.opportunities.flatMap((item) => {
        const position = current.transcript.find((turn) => turn.id === item.positionTurnId);
        const marker = {
          id: crypto.randomUUID(),
          type: "MARKER_EVALUATED",
          occurredAt: analysis.analyzedAt,
          turnId: item.responseTurnId,
          opportunityId: item.opportunityId,
          details: { score: item.score, confidence: item.confidence, rubricVersion: analysis.rubricVersion },
        };
        const positionEvent = current.events.some((event) => event.type === "AI_POSITION_EMITTED" && event.turnId === item.positionTurnId)
          ? []
          : [{
            id: crypto.randomUUID(),
            type: "AI_POSITION_EMITTED",
            occurredAt: position?.createdAt || analysis.analyzedAt,
            turnId: item.positionTurnId,
            opportunityId: item.opportunityId,
          }];
        const interestEvents = item.interestConfirmed && item.reactionTurnId
          ? [
            { id: crypto.randomUUID(), type: "INTEREST_REVEALED", occurredAt: analysis.analyzedAt, turnId: item.reactionTurnId, opportunityId: item.opportunityId },
            { id: crypto.randomUUID(), type: "INTEREST_VALIDATED", occurredAt: analysis.analyzedAt, turnId: item.reactionTurnId, opportunityId: item.opportunityId },
          ]
          : [];
        return [...positionEvent, marker, ...interestEvents];
      });
      const updated = {
        ...current,
        analysis,
        events: [
          ...current.events,
          ...(!current.events.some((event) => event.type === "EVALUATION_STARTED")
            ? [{ id: crypto.randomUUID(), type: "EVALUATION_STARTED", occurredAt: new Date().toISOString() }]
            : []),
          ...addedEvents,
          { id: crypto.randomUUID(), type: "EVALUATION_COMPLETED", occurredAt: analysis.analyzedAt },
          { id: crypto.randomUUID(), type: "REPORT_READY", occurredAt: analysis.analyzedAt },
          { id: crypto.randomUUID(), type: "REPORT_GENERATED", occurredAt: analysis.analyzedAt },
        ],
      };
      saveAttempt(updated);
      setAttempt(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось подготовить отчёт");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (enabled && attempt?.endedAt && !attempt.analysis) void runAnalysis(attempt);
  }, [enabled, attempt?.id, attempt?.endedAt, attempt?.analysis, runAnalysis]);

  const retry = useCallback(() => {
    if (!enabled || !attempt) return;
    startedRef.current = false;
    void runAnalysis(attempt);
  }, [attempt, enabled, runAnalysis]);

  return { attempt, isAnalyzing, error, retry };
}
