import assert from "node:assert/strict";
import test from "node:test";
import { assessCompletion, b3L2CompletionPolicy } from "../server/completion-policy";
import { b3L2HintPolicy, hintText, isVoiceHintCommand, nextHintLevel } from "../src/lib/lesson-hints";
import { analyzeAttempt } from "../src/services/reporting-api";
import type { StoredAttempt } from "../src/types/reporting";

test("hint support rises once per display and remains at H3", () => {
  assert.deepEqual([0, 1, 2, 3, 4].map(nextHintLevel), [1, 2, 3, 3, 3]);
  assert.match(hintText(b3L2HintPolicy, 3, "O2"), /скорость решений/);
  assert.match(hintText(b3L2HintPolicy, 3, "O3"), /оценку как угрозу/);
  assert.match(hintText(b3L2HintPolicy, 3, "O1"), /не перегрузить мастеров/);
});

test("voice command is explicit and cannot consume a normal answer", () => {
  assert.equal(isVoiceHintCommand("Тренер, дай подсказку!", b3L2HintPolicy), true);
  assert.equal(isVoiceHintCommand("Тренер, дай подсказку и скажи директору", b3L2HintPolicy), false);
  assert.equal(isVoiceHintCommand("Я думаю, что мастера перегружены", b3L2HintPolicy), false);
});

const opening = { role: "assistant" as const, content: "Новые процедуры не нужны. Мастера перегружены до запуска линии." };
const firstUser = { role: "user" as const, content: "Вы опасаетесь сорвать запуск из-за нагрузки на мастеров?" };
const firstReply = { role: "assistant" as const, content: "Да, новые задачи отвлекут мастеров от запуска линии." };
const secondPosition = { role: "assistant" as const, content: "При этом наши решения на месте принимаются быстрее корпоративных процедур." };
const secondUser = { role: "user" as const, content: "Вам важно сохранить скорость решений на месте?" };

test("one valid opportunity cannot trigger closing", () => {
  const result = assessCompletion([opening, firstUser, firstReply, secondPosition]);
  assert.equal(result.state, "ACTIVE");
  assert.equal(result.validOpportunityCount, 1);
  assert.equal(result.currentOpportunityId, "O2");
});

test("two answered opportunities and a scenario outcome require a final action", () => {
  const result = assessCompletion([
    opening, firstUser, firstReply, secondPosition, secondUser,
    { role: "assistant", content: "Если скорость решений сохранится, можно обсуждать пилот в одном подразделении." },
  ]);
  assert.equal(result.state, "CLOSING_REQUIRED");
  assert.equal(result.reason, "GOAL_COMPLETE");
  assert.equal(result.validOpportunityCount, 2);
  assert.equal(result.scenarioOutcome, "PARTIAL");
});

test("two answered opportunities without an outcome continue the conversation", () => {
  const result = assessCompletion([
    opening, firstUser, firstReply, secondPosition, secondUser,
    { role: "assistant", content: "Уточните, как это повлияет на согласования." },
  ]);
  assert.equal(result.state, "ACTIVE");
});

test("the configured turn cap requests closing even if only one opportunity arose", () => {
  const turns: Array<{ role: "user" | "assistant"; content: string }> = [opening];
  for (let index = 0; index < b3L2CompletionPolicy.maxUserTurns; index += 1) {
    turns.push({ role: "user", content: `Ответ ${index + 1}` });
    turns.push({ role: "assistant", content: "Нам нельзя отвлекать мастеров от запуска." });
  }
  const result = assessCompletion(turns);
  assert.equal(result.state, "CLOSING_REQUIRED");
  assert.equal(result.reason, "LIMIT_REACHED");
  assert.equal(result.validOpportunityCount, 1);
});

test("a terminal director boundary ends the session before a closing action", () => {
  const result = assessCompletion([
    opening, firstUser,
    { role: "assistant", content: "Не вижу смысла продолжать разговор. Встреча окончена." },
  ]);
  assert.equal(result.state, "COMPLETED");
  assert.equal(result.reason, "RESISTANCE");
});

test("an empty analysis response produces a recoverable error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("", { status: 500 });
  try {
    await assert.rejects(
      analyzeAttempt({ id: "test" } as StoredAttempt),
      /Не удалось подготовить отчёт \(500\)/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("director reply is cut before an invented user turn", async () => {
  const { cleanDirectorReply } = await import("../server/reply-cleanup");
  assert.equal(
    cleanDirectorReply("Да, именно так. Мы привыкли оперативно реагировать.\n\nПользователь: Есть ли опасения?"),
    "Да, именно так. Мы привыкли оперативно реагировать.",
  );
  assert.equal(cleanDirectorReply("Директор: Вернёмся к этому через полгода."), "Вернёмся к этому через полгода.");
  assert.equal(cleanDirectorReply("«Мастера перегружены.»"), "Мастера перегружены.");
  assert.equal(cleanDirectorReply("Вы правы, сроки важны."), "Вы правы, сроки важны.");
});
