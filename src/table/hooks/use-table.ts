import { useCallback, useEffect, useRef, useState } from "react";
import { cardById, CONDITION_IDS, redLineIssues, scenario, tokenCost } from "../../../shared/table/scenario";
import { moveJournal } from "../../../shared/table/moves";
import type { CardId, ConditionId, Move, Package, TableState } from "../../../shared/table/types";
import { ApiError, finishTable, saveTime, sendMove } from "@/table/services/api";
import { rememberTable } from "@/table/services/history";

export type Overlay = "pause" | "connection" | "exit" | "redline" | null;

export interface ConcessionDraft { give: ConditionId; giveIndex: number; ask: ConditionId; askIndex: number }

export interface Drafts {
  questionId: string;
  criterionId: string;
  concession: ConcessionDraft;
  anchor: Package;
  pkg: Package;
}

function initialDrafts(state: TableState): Drafts {
  const firstQuestion = ["volume", "payment", "term", "warranty"].find((id) => !state.askedQuestions.includes(id)) ?? "volume";
  const firstCriterion = ["budget", "deadline", "alternative"].find((id) => !state.usedCriteria.includes(id)) ?? "budget";
  return {
    questionId: firstQuestion,
    criterionId: firstCriterion,
    concession: defaultConcession(state),
    anchor: { ...scenario.goals },
    pkg: { ...state.position },
  };
}

/** Default exchange: give the next step on the first condition where we still stand far from the offer. */
export function defaultConcession(state: TableState): ConcessionDraft {
  const give: ConditionId = state.position.qty < state.supplierOffer.qty ? "qty" : CONDITION_IDS.find((id) => state.position[id] < state.supplierOffer[id] && id !== "price") ?? "term";
  const ask: ConditionId = give !== "price" && state.supplierOffer.price > state.position.price ? "price" : CONDITION_IDS.find((id) => id !== give && state.supplierOffer[id] > state.position[id]) ?? "warranty";
  return {
    give,
    giveIndex: Math.min(state.position[give] + 1, 2),
    ask,
    askIndex: state.position[ask],
  };
}

export function moveOf(card: CardId, drafts: Drafts): Move {
  switch (card) {
    case "question": return { card, questionId: drafts.questionId };
    case "criterion": return { card, criterionId: drafts.criterionId };
    case "anchor": return { card, pkg: drafts.anchor };
    case "package": return { card, pkg: drafts.pkg };
    case "concession": return { card, ...drafts.concession };
    case "summary": return { card };
  }
}

/** Tokens a move would spend (the client mirror of the server rule). */
export function costOf(state: TableState, move: Move) {
  if (move.card === "package") return tokenCost(state.position, move.pkg);
  if (move.card === "concession") return tokenCost(state.position, { [move.give]: move.giveIndex });
  return 0;
}

export function redLineOf(state: TableState, move: Move) {
  if (move.card === "package" || move.card === "anchor") return redLineIssues(move.pkg);
  if (move.card === "concession") return redLineIssues({ ...state.position, [move.give]: move.giveIndex });
  return [];
}

export function useTable(initial: TableState) {
  const [state, setState] = useState(initial);
  const [selected, setSelected] = useState<CardId | null>(null);
  const [drafts, setDrafts] = useState<Drafts>(() => initialDrafts(initial));
  const [pending, setPending] = useState<{ move: Move; id: string; journal: string } | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(initial.elapsedSec);
  const elapsedRef = useRef(initial.elapsedSec);
  const failedRef = useRef<{ move: Move; id: string; journal: string } | null>(null);
  const stateRef = useRef(initial);
  stateRef.current = state;

  const active = state.status === "active";
  const clockStopped = !active || overlay === "pause" || overlay === "connection" || overlay === "exit";

  // Meeting clock: an orientation only, it never ends the training.
  useEffect(() => {
    if (clockStopped) return;
    const timer = window.setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current % 15 === 0) void saveTime(stateRef.current.id, elapsedRef.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [clockStopped]);

  useEffect(() => {
    if (state.status === "deal" || state.status === "no_deal") rememberTable(state);
  }, [state]);

  const deliver = useCallback(async (move: Move, id: string, journal: string) => {
    setPending({ move, id, journal });
    setNotice(null);
    try {
      const next = await sendMove(stateRef.current.id, move, id, elapsedRef.current);
      failedRef.current = null;
      setState(next);
      setDrafts(initialDrafts(next));
      setSelected(null);
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 408) {
        // A rule violation: the move was not accepted, nothing was spent.
        setNotice(error.message);
      } else {
        failedRef.current = { move, id, journal };
        setOverlay("connection");
      }
    } finally {
      setPending(null);
    }
  }, []);

  const select = useCallback((card: CardId | null) => {
    if (pending || stateRef.current.status !== "active") return;
    setNotice(null);
    setSelected((current) => (current === card ? null : card));
  }, [pending]);

  const canPlay = (card: CardId) => {
    if (!active || pending) return false;
    if (state.cardsLeft[card] <= 0) return false;
    return true;
  };

  function blockedReason(): string | null {
    if (!selected) return null;
    const move = moveOf(selected, drafts);
    if (selected === "summary" && !state.dealReady) return "Резюме — после принятого пакета";
    if (selected === "concession") {
      if (state.tokensLeft <= 0) return "Для уступки нужен жетон";
      if (drafts.concession.give === drafts.concession.ask) return "Выберите разные условия";
    }
    if (selected === "criterion" && state.usedCriteria.includes(drafts.criterionId)) return "Этот критерий уже использован";
    if (costOf(state, move) > state.tokensLeft) return "Не хватает жетонов уступок";
    return null;
  }

  function makeMove(confirmRedLine = false) {
    if (!selected || pending || !active) return;
    if (blockedReason()) return;
    let move = moveOf(selected, drafts);
    if (!confirmRedLine && redLineOf(state, move).length) {
      setOverlay("redline");
      return;
    }
    if (move.card === "package") move = { ...move, confirmRedLine: redLineOf(state, move).length > 0 };
    setOverlay(null);
    void deliver(move, crypto.randomUUID(), moveJournal(state, move));
  }

  function retry() {
    const failed = failedRef.current;
    setOverlay(null);
    if (failed) void deliver(failed.move, failed.id, failed.journal);
  }

  async function abort() {
    try {
      await finishTable(state.id, elapsedRef.current);
    } catch {
      // Leaving is always possible: the unfinished table simply stays on the server.
    }
  }

  return {
    state,
    selected,
    select,
    drafts,
    setDrafts,
    pending,
    overlay,
    setOverlay,
    notice,
    setNotice,
    elapsed,
    canPlay,
    blockedReason,
    makeMove,
    retry,
    abort,
    redLineText: selected ? redLineOf(state, moveOf(selected, drafts)) : [],
    cost: selected ? costOf(state, moveOf(selected, drafts)) : 0,
    cardTitle: selected ? cardById(selected).title : "",
  };
}

export function clock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}
