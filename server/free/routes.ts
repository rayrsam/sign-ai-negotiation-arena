import express from "express";
import { isSeed } from "../../shared/free/seed";
import { PRESET_SEED, presetBrief } from "../../shared/free/preset-scenario";
import type { ChatReplyPayload } from "../../shared/free/types";
import { getScenario, saveScenario } from "./card";
import { counterpartyReply, type Turn } from "./counterparty";
import { analyzeSession, normalizeAnalysisInput } from "./evaluator";
import { assembleScenario, describeSettingsForLog, sanitizeSettings } from "./scenario";
import { synthesizeSpeech } from "./yandex";

/** Routes of the free negotiations (`/api/free/*`), mounted by the main server. */
export const freeRouter = express.Router();

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeMessages(value: unknown): Turn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((message): message is Turn =>
      typeof message === "object" && message !== null &&
      ["user", "assistant"].includes((message as Turn).role) && typeof (message as Turn).content === "string")
    .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 4000) }))
    .filter((message) => message.content.length > 0)
    .slice(-40);
}

// ---------- scenario: assemble, preset, load by seed ----------

freeRouter.post("/api/free/scenario/assemble", async (request, response) => {
  const settings = sanitizeSettings(request.body?.settings);
  try {
    const { brief, card, model, settings: effective } = await assembleScenario(settings);
    saveScenario({ brief, card, model, createdAt: brief.createdAt });
    console.log(`Сценарий ${brief.seed} собран (${describeSettingsForLog(effective)}, ${model})`);
    response.json({ brief });
  } catch (error) {
    console.error("Ошибка сборки сценария:", error);
    response.status(502).json({ error: "Генератор сейчас недоступен. Частично собранную ситуацию мы не используем." });
  }
});

freeRouter.post("/api/free/scenario/preset", (_request, response) => {
  response.json({ brief: presetBrief });
});

freeRouter.get("/api/free/scenario/:seed", (request, response) => {
  const seed = String(request.params.seed).toUpperCase();
  const scenario = isSeed(seed) ? getScenario(seed) : null;
  if (!scenario) {
    response.status(404).json({ error: "Сессия с таким seed не найдена" });
    return;
  }
  response.json({ brief: scenario.brief });
});

// ---------- meeting: counterparty replies ----------

const chatRequests = new Map<string, { fingerprint: string; promise: Promise<ChatReplyPayload> }>();

freeRouter.post("/api/free/chat", async (request, response) => {
  const seed = String(request.body?.seed ?? "").toUpperCase();
  const scenario = isSeed(seed) ? getScenario(seed) : null;
  if (!scenario) {
    response.status(404).json({ error: "Сценарий встречи не найден. Начните новую сессию." });
    return;
  }
  const messages = normalizeMessages(request.body?.messages);
  const closing = request.body?.phase === "CLOSING_REQUIRED";
  const timeUp = request.body?.timeUp === true;
  const clientEventId = typeof request.body?.clientEventId === "string" && request.body.clientEventId.length <= 100
    ? request.body.clientEventId
    : undefined;

  if (messages.length === 0 || messages.at(-1)?.role !== "user") {
    response.status(400).json({ error: "Сообщение не передано" });
    return;
  }
  if (closing && !messages.slice(0, -1).some((message) => message.role === "assistant" && /Подведите итог/i.test(message.content))) {
    response.status(409).json({ error: "Финальное действие пока не запрошено" });
    return;
  }

  try {
    const fingerprint = JSON.stringify({ seed, closing, messages });
    const cached = clientEventId ? chatRequests.get(clientEventId) : undefined;
    if (cached && cached.fingerprint !== fingerprint) {
      response.status(409).json({ error: "Идентификатор хода уже использован" });
      return;
    }
    // A repeated delivery of the same turn returns the same reply instead of a second one.
    const promise = cached?.promise ?? counterpartyReply({ brief: scenario.brief, card: scenario.card, messages, closing, timeUp });
    if (clientEventId && !cached) {
      chatRequests.set(clientEventId, { fingerprint, promise });
      if (chatRequests.size > 1_000) chatRequests.delete(chatRequests.keys().next().value!);
    }
    response.json(await promise);
  } catch (error) {
    if (clientEventId) chatRequests.delete(clientEventId);
    console.error("Ошибка YandexGPT:", error);
    response.status(502).json({ error: errorMessage(error, "Ошибка YandexGPT") });
  }
});

// ---------- speech ----------
// Speech recognition is shared with the lessons: the client posts to `/api/transcribe` (server/index.ts).

freeRouter.post("/api/free/tts", async (request, response) => {
  const text = typeof request.body?.text === "string" ? request.body.text.trim() : "";
  if (!text) {
    response.status(400).json({ error: "Нет текста для озвучивания" });
    return;
  }
  try {
    const audio = await synthesizeSpeech(text, request.body?.gender === "m" ? "m" : "f");
    response.setHeader("Content-Type", "audio/mpeg");
    response.setHeader("Cache-Control", "no-store");
    response.send(audio);
  } catch (error) {
    console.error("Ошибка озвучивания:", error);
    response.status(502).json({ error: "Озвучивание недоступно" });
  }
});

// ---------- evaluation ----------

freeRouter.post("/api/free/analyze", async (request, response) => {
  let input: ReturnType<typeof normalizeAnalysisInput>;
  try {
    input = normalizeAnalysisInput(request.body);
  } catch (error) {
    response.status(400).json({ error: errorMessage(error, "Некорректная сессия") });
    return;
  }
  const scenario = getScenario(input.seed) ?? getScenario(PRESET_SEED)!;
  try {
    response.json({ analysis: await analyzeSession(input, scenario.brief, scenario.card) });
  } catch (error) {
    console.error("Ошибка анализа встречи:", error);
    response.status(502).json({ error: "Не удалось подготовить разбор. Встреча сохранена — повторите анализ." });
  }
});
