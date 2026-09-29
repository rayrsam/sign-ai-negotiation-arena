import type { StoredAttempt } from "@/types/reporting";

const ATTEMPT_PREFIX = "negotiation-arena:attempt:";
const ATTEMPT_INDEX = "negotiation-arena:attempt-index:v1";
const MAX_SAVED_ATTEMPTS = 20;

function readIndex(): string[] {
  try {
    const value = localStorage.getItem(ATTEMPT_INDEX);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: StoredAttempt) {
  localStorage.setItem(`${ATTEMPT_PREFIX}${attempt.id}`, JSON.stringify(attempt));
  const previous = readIndex().filter((id) => id !== attempt.id);
  const next = [attempt.id, ...previous].slice(0, MAX_SAVED_ATTEMPTS);
  localStorage.setItem(ATTEMPT_INDEX, JSON.stringify(next));

  for (const expiredId of previous.slice(MAX_SAVED_ATTEMPTS - 1)) {
    localStorage.removeItem(`${ATTEMPT_PREFIX}${expiredId}`);
  }
}

export function getAttempt(id: string): StoredAttempt | null {
  try {
    const value = localStorage.getItem(`${ATTEMPT_PREFIX}${id}`);
    return value ? JSON.parse(value) as StoredAttempt : null;
  } catch {
    return null;
  }
}

export function getLatestAttempt(): StoredAttempt | null {
  for (const id of readIndex()) {
    const attempt = getAttempt(id);
    if (attempt?.endedAt) return attempt;
  }
  return null;
}

export function getAttemptPrefix(attempt: StoredAttempt, turnId: string): StoredAttempt["transcript"] {
  const endIndex = attempt.transcript.findIndex((turn) => turn.id === turnId);
  return endIndex < 0 ? [] : attempt.transcript.slice(0, endIndex + 1);
}
