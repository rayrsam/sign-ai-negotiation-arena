import type { ChatMessage } from "@/types/meeting";
import { encodePcm16 } from "@/lib/audio-pcm";

async function readJson<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let payload: (T & { error?: string }) | null = null;
  try {
    payload = raw ? JSON.parse(raw) as T & { error?: string } : null;
  } catch {
    // A failed proxy or an upstream service can return HTML instead of JSON.
  }
  if (!response.ok) {
    throw new Error(payload?.error || `Сервер вернул ошибку ${response.status}. Повторите действие.`);
  }
  if (!payload) throw new Error("Сервер вернул пустой ответ. Повторите действие.");
  return payload;
}

export async function transcribeAudio(blob: Blob, signal: AbortSignal) {
  let decoded: AudioBuffer;
  try {
    const decoder = new OfflineAudioContext(1, 1, 16_000);
    decoded = await decoder.decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new Error("Не удалось обработать аудиозапись. Попробуйте записать ещё раз.");
  }

  const channels = Array.from(
    { length: decoded.numberOfChannels },
    (_, index) => decoded.getChannelData(index),
  );
  const pcm = encodePcm16(channels);
  if (pcm.byteLength > 1_000_000) {
    throw new Error("Запись слишком длинная. Запишите не более 30 секунд.");
  }

  const formData = new FormData();
  formData.append("audio", new Blob([pcm], { type: "audio/lpcm" }), "negotiation.pcm");

  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
    signal,
  });
  return readJson<{ text: string }>(response);
}

export async function synthesizeSpeech(text: string, signal: AbortSignal): Promise<Blob> {
  const response = await fetch("/api/speak", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    await readJson(response);
  }
  const audio = await response.blob();
  if (!audio.size) throw new Error("Сервер вернул пустую озвучку.");
  return audio;
}

export async function requestAssistantReply(
  messages: ChatMessage[],
  signal: AbortSignal,
  options: { phase: "ACTIVE" | "CLOSING_REQUIRED"; clientEventId: string },
) {
  const response = await fetch("/api/chat", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phase: options.phase,
      clientEventId: options.clientEventId,
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  });
  return readJson<{
    reply: string;
    completionState?: "ACTIVE" | "CLOSING_REQUIRED" | "COMPLETED";
    completionReason?: "GOAL_COMPLETE" | "LIMIT_REACHED" | "RESISTANCE";
    opportunityId?: string;
    validOpportunityCount?: number;
    scenarioOutcome?: "SUCCESS" | "PARTIAL" | "RESISTANCE" | "NO_DEAL" | "UNKNOWN";
    policyVersion?: string;
  }>(response);
}
