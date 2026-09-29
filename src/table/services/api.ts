import type { Move, SessionReport, TableState, TrainingSettings } from "../../../shared/table/types";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let payload: (T & { error?: string }) | null = null;
  try {
    payload = raw ? JSON.parse(raw) as T & { error?: string } : null;
  } catch {
    // A failed proxy or an upstream service can return HTML instead of JSON.
  }
  if (!response.ok) throw new ApiError(payload?.error || `Сервер вернул ошибку ${response.status}. Повторите действие.`, response.status);
  if (!payload) throw new ApiError("Сервер вернул пустой ответ. Повторите действие.", 502);
  return payload;
}

function post(url: string, body: unknown, signal?: AbortSignal) {
  return fetch(url, { method: "POST", signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

export async function startTable(settings: TrainingSettings) {
  return (await readJson<{ state: TableState }>(await post("/api/table/start", { settings }))).state;
}

export async function loadTable(id: string, signal?: AbortSignal) {
  return (await readJson<{ state: TableState }>(await fetch(`/api/table/${encodeURIComponent(id)}`, { signal }))).state;
}

export async function sendMove(id: string, move: Move, clientEventId: string, elapsedSec: number, signal?: AbortSignal) {
  return (await readJson<{ state: TableState }>(await post(`/api/table/${encodeURIComponent(id)}/turn`, { move, clientEventId, elapsedSec }, signal))).state;
}

export async function saveTime(id: string, elapsedSec: number) {
  try {
    await post(`/api/table/${encodeURIComponent(id)}/time`, { elapsedSec });
  } catch {
    // The clock is advisory: a lost update is harmless.
  }
}

export async function finishTable(id: string, elapsedSec: number) {
  return (await readJson<{ state: TableState }>(await post(`/api/table/${encodeURIComponent(id)}/finish`, { elapsedSec }))).state;
}

export async function loadReport(id: string, signal?: AbortSignal) {
  return readJson<{ state: TableState; report: SessionReport }>(await post(`/api/table/${encodeURIComponent(id)}/report`, {}, signal));
}
