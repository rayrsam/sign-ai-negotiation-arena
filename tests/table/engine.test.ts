import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultSettings, redLineIssues, scenario, sumOf, tokenCost } from "../../shared/table/scenario";
import type { Move, TableState } from "../../shared/table/types";
import { MoveError, applyMove, createSession, validateMove } from "../../server/table/engine";
import { acceptable, repair } from "../../server/table/supplier-card";
import { scoreOf } from "../../server/table/report";

const play = (state: TableState, move: Move) => applyMove(state, move).state;

test("start of the table matches the mockup", () => {
  const state = createSession("t", defaultSettings());
  assert.equal(sumOf(state.supplierOffer), 7_200_000);
  assert.equal(state.tokensLeft, 3);
  assert.equal(state.maxTurns, 8);
  assert.equal(state.trust, 60);
  assert.deepEqual(redLineIssues(state.supplierOffer), ["общая сумма выше 5 500 000 ₽", "гарантия меньше 24 месяцев"]);
});

test("the canonical path reaches 44 000 × 120 = 5 280 000 with three conditional concessions", () => {
  let state = createSession("t", defaultSettings());
  state = play(state, { card: "question", questionId: "volume" });
  assert.equal(state.motives.find((motive) => motive.id === "volume")?.revealed, true);
  assert.equal(state.points, 18);
  assert.equal(state.trust, 68);
  state = play(state, { card: "question", questionId: "payment" });
  state = play(state, { card: "anchor", pkg: { ...scenario.goals } });
  assert.equal(state.motives.filter((motive) => motive.revealed).length, 3);
  state = play(state, { card: "concession", give: "qty", giveIndex: 1, ask: "price", askIndex: 0 });
  assert.equal(state.tokensLeft, 2);
  assert.equal(state.supplierOffer.price, 0);
  state = play(state, { card: "concession", give: "term", giveIndex: 1, ask: "warranty", askIndex: 1 });
  assert.equal(state.tokensLeft, 1);
  const pkg = { price: 0, qty: 1, term: 1, payment: 1, warranty: 1 };
  assert.equal(tokenCost(state.position, pkg), 1);
  state = play(state, { card: "package", pkg });
  assert.equal(state.dealReady, true);
  assert.equal(state.tokensLeft, 0);
  state = play(state, { card: "summary" });
  assert.equal(state.status, "deal");
  assert.equal(sumOf(state.acceptedPackage!), 5_280_000);
  assert.ok(state.concessions.every((item) => item.conditional));
  assert.ok(scoreOf(state) >= 3);
});

test("supplier rules: 44 000 only from 120 pcs, no full deferral", () => {
  assert.equal(acceptable({ price: 0, qty: 0, term: 1, payment: 1, warranty: 1 }, "basic"), false);
  assert.equal(acceptable({ price: 0, qty: 1, term: 1, payment: 1, warranty: 1 }, "basic"), true);
  assert.equal(acceptable({ price: 1, qty: 0, term: 2, payment: 0, warranty: 1 }, "basic"), false);
  const counter = repair({ price: 0, qty: 0, term: 0, payment: 0, warranty: 1 }, ["price"], "basic");
  assert.ok(counter && acceptable(counter, "basic"));
});

test("moves are validated: tokens, red lines, summary", () => {
  let state = createSession("t", defaultSettings());
  assert.throws(() => validateMove(state, { card: "summary" }), MoveError);
  const tooExpensive = { price: 2, qty: 2, term: 2, payment: 2, warranty: 2 };
  assert.throws(() => validateMove(state, { card: "package", pkg: tooExpensive }), /жетон/);
  state = { ...state, tokensLeft: 99 };
  assert.throws(() => validateMove(state, { card: "package", pkg: tooExpensive }), /красную линию/);
  assert.doesNotThrow(() => validateMove(state, { card: "package", pkg: tooExpensive, confirmRedLine: true }));
});

test("the table ends when the moves run out", () => {
  let state = createSession("t", { ...defaultSettings(), difficulty: "high" });
  const moves: Move[] = [
    { card: "question", questionId: "volume" }, { card: "question", questionId: "payment" }, { card: "question", questionId: "term" },
    { card: "criterion", criterionId: "budget" }, { card: "criterion", criterionId: "deadline" },
    { card: "anchor", pkg: { ...scenario.goals } }, { card: "concession", give: "qty", giveIndex: 1, ask: "price", askIndex: 0 },
  ];
  for (const move of moves) state = play(state, move);
  assert.equal(state.status, "no_deal");
  assert.equal(state.endReason, "turns");
});
