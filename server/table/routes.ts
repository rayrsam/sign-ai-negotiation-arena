import { randomUUID } from "node:crypto";
import express from "express";
import { defaultSettings, difficultyRules, methods, roles, skills, topics } from "../../shared/table/scenario";
import type { Difficulty, MethodId, Move, TableState, TrainingSettings } from "../../shared/table/types";
import { MoveError, applyMove, createSession, finishManually } from "./engine";
import { phraseSupplier } from "./phrasing";
import { buildReport } from "./report";
import { getReport, getTable, saveReport, saveTable } from "./store";

/** Routes of the table mini-game (`/api/table/*`), mounted by the main server. */
export const tableRouter = express.Router();

const record = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {});

function sanitizeSettings(value: unknown): TrainingSettings {
  const input = record(value);
  const base = defaultSettings();
  const method = methods.find((item) => item.id === input.method) ?? methods.find((item) => item.id === base.method)!;
  return {
    format: "table",
    method: method.id as MethodId,
    stage: method.stages.includes(String(input.stage)) ? String(input.stage) : method.stages[0],
    skill: skills.includes(String(input.skill)) ? String(input.skill) : base.skill,
    topic: topics.includes(String(input.topic)) ? String(input.topic) : base.topic,
    role: roles.includes(String(input.role)) ? String(input.role) : base.role,
    difficulty: (Object.keys(difficultyRules) as Difficulty[]).includes(input.difficulty as Difficulty) ? input.difficulty as Difficulty : base.difficulty,
  };
}

function sanitizeMove(value: unknown): Move {
  const input = record(value);
  const pkg = (raw: unknown) => {
    const source = record(raw);
    return {
      price: Number(source.price), qty: Number(source.qty), term: Number(source.term), payment: Number(source.payment), warranty: Number(source.warranty),
    };
  };
  switch (input.card) {
    case "question": return { card: "question", questionId: String(input.questionId ?? "") };
    case "criterion": return { card: "criterion", criterionId: String(input.criterionId ?? "") };
    case "anchor": return { card: "anchor", pkg: pkg(input.pkg) };
    case "package": return { card: "package", pkg: pkg(input.pkg), confirmRedLine: input.confirmRedLine === true };
    case "concession": return {
      card: "concession",
      give: String(input.give) as never,
      giveIndex: Number(input.giveIndex),
      ask: String(input.ask) as never,
      askIndex: Number(input.askIndex),
    };
    case "summary": return { card: "summary" };
    default: throw new MoveError("Неизвестная карта", 400);
  }
}

const clampElapsed = (value: unknown, state: TableState) => {
  const seconds = Math.round(Number(value));
  return Number.isFinite(seconds) && seconds >= state.elapsedSec && seconds < 6 * 3600 ? seconds : state.elapsedSec;
};

// ---------- table ----------

tableRouter.post("/api/table/start", (request, response) => {
  const settings = sanitizeSettings(request.body?.settings);
  const state = createSession(randomUUID(), settings);
  saveTable(state);
  console.log(`Стол ${state.id} начат (${settings.difficulty}, ${settings.skill})`);
  response.json({ state });
});

tableRouter.get("/api/table/:id", (request, response) => {
  const state = getTable(String(request.params.id));
  if (!state) {
    response.status(404).json({ error: "Тренировка не найдена. Соберите новую." });
    return;
  }
  response.json({ state });
});

const turnRequests = new Map<string, { fingerprint: string; promise: Promise<TableState> }>();
const locks = new Set<string>();

tableRouter.post("/api/table/:id/turn", async (request, response) => {
  const id = String(request.params.id);
  const state = getTable(id);
  if (!state) {
    response.status(404).json({ error: "Тренировка не найдена. Соберите новую." });
    return;
  }
  const clientEventId = typeof request.body?.clientEventId === "string" && request.body.clientEventId.length <= 100 ? request.body.clientEventId : "";
  if (!clientEventId) {
    response.status(400).json({ error: "Ход не подписан" });
    return;
  }
  let move: Move;
  try {
    move = sanitizeMove(request.body?.move);
  } catch (error) {
    response.status(error instanceof MoveError ? error.status : 400).json({ error: error instanceof Error ? error.message : "Некорректный ход" });
    return;
  }
  const fingerprint = JSON.stringify({ id, move });
  const cached = turnRequests.get(clientEventId);
  if (cached && cached.fingerprint !== fingerprint) {
    response.status(409).json({ error: "Идентификатор хода уже использован" });
    return;
  }
  // A repeated delivery of the same turn returns the same result instead of a second move.
  if (cached) {
    try {
      response.json({ state: await cached.promise });
    } catch (error) {
      response.status(error instanceof MoveError ? error.status : 502).json({ error: error instanceof Error ? error.message : "Ход не принят" });
    }
    return;
  }
  if (locks.has(id)) {
    response.status(409).json({ error: "Повторная отправка заблокирована — ход уже принят" });
    return;
  }
  const promise = (async () => {
    locks.add(id);
    try {
      const current = getTable(id)!;
      current.elapsedSec = clampElapsed(request.body?.elapsedSec, current);
      const { state: next, decision, userLine } = applyMove(current, move);
      next.reply = { ...next.reply, text: await phraseSupplier(next, decision, userLine) };
      next.moves[next.moves.length - 1].supplierLine = next.reply.text;
      saveTable(next);
      return next;
    } finally {
      locks.delete(id);
    }
  })();
  turnRequests.set(clientEventId, { fingerprint, promise });
  if (turnRequests.size > 1_000) turnRequests.delete(turnRequests.keys().next().value!);
  try {
    response.json({ state: await promise });
  } catch (error) {
    turnRequests.delete(clientEventId);
    const status = error instanceof MoveError ? error.status : 502;
    if (!(error instanceof MoveError)) console.error("Ошибка хода:", error);
    response.status(status).json({ error: error instanceof Error ? error.message : "Ход не принят" });
  }
});

tableRouter.post("/api/table/:id/time", (request, response) => {
  const state = getTable(String(request.params.id));
  if (!state) {
    response.status(404).json({ error: "Тренировка не найдена" });
    return;
  }
  state.elapsedSec = clampElapsed(request.body?.elapsedSec, state);
  saveTable(state);
  response.json({ ok: true });
});

tableRouter.post("/api/table/:id/finish", (request, response) => {
  const state = getTable(String(request.params.id));
  if (!state) {
    response.status(404).json({ error: "Тренировка не найдена" });
    return;
  }
  const next = finishManually({ ...state, elapsedSec: clampElapsed(request.body?.elapsedSec, state) });
  saveTable(next);
  response.json({ state: next });
});

const reportRequests = new Map<string, Promise<unknown>>();

tableRouter.post("/api/table/:id/report", async (request, response) => {
  const id = String(request.params.id);
  const state = getTable(id);
  if (!state) {
    response.status(404).json({ error: "Тренировка не найдена" });
    return;
  }
  if (state.status === "active" || state.status === "aborted") {
    response.status(409).json({ error: "Отчёт появится после завершения тренировки" });
    return;
  }
  const ready = getReport(id);
  if (ready) {
    response.json({ state, report: ready });
    return;
  }
  try {
    const promise = reportRequests.get(id) ?? buildReport(state).then((report) => {
      saveReport(id, report);
      return report;
    });
    reportRequests.set(id, promise);
    const report = await promise;
    response.json({ state, report });
  } catch (error) {
    console.error("Ошибка отчёта:", error);
    response.status(502).json({ error: "Не удалось подготовить отчёт. Повторите." });
  } finally {
    reportRequests.delete(id);
  }
});
