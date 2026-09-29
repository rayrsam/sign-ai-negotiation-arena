import type { ReportAnalysis, StoredAttempt } from "@/types/reporting";

export async function analyzeAttempt(attempt: StoredAttempt): Promise<ReportAnalysis> {
  const response = await fetch("/api/analyze-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attempt }),
  });
  const raw = await response.text();
  let payload: { analysis?: ReportAnalysis; error?: string } = {};
  try { payload = raw ? JSON.parse(raw) as typeof payload : {}; } catch { /* upstream may return HTML */ }
  if (!response.ok || !payload.analysis) {
    throw new Error(payload.error || `Не удалось подготовить отчёт (${response.status}). Повторите попытку.`);
  }
  return payload.analysis;
}
