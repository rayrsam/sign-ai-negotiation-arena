// Deterministic rules of «Стол переговоров». The model only phrases the supplier's lines:
// what the supplier agrees to, which motive opens and how tokens move is decided here.
import {
  BUDGET, CONDITION_IDS, cardById, cards, conditions, criteria, difficultyRules, formatMoney, optionOf, packageLine, questions,
  redLineIssues, samePackage, scenario, sumOf, tokenCost, worsened,
} from "../../shared/table/scenario";
import type {
  CardId, ConcessionRecord, ConditionId, Move, MoveRecord, Package, TableState, TrainingSettings,
} from "../../shared/table/types";
import { describeProposal, moveJournal, moveLine, offerSentence } from "../../shared/table/moves";
import { acceptable, motives, objections, questionMotive, repair, warrantyFact, type MotiveDef, type Objection } from "./supplier-card";

export class MoveError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
  }
}

/** What the supplier does this turn — the source for the phrasing prompt and the fallback line. */
export interface Decision {
  kind: "motive" | "info" | "accept" | "counter" | "reject" | "deal" | "criterion";
  /** Deterministic line that is always correct; the model may rephrase it. */
  line: string;
  journal: string;
  facts: string[];
  label: string;
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

export function createSession(id: string, settings: TrainingSettings): TableState {
  const rules = difficultyRules[settings.difficulty];
  const cardsLeft = Object.fromEntries(cards.map((card) => [card.id, card.limit])) as Record<CardId, number>;
  const offer = { ...scenario.startOffer };
  const position = { ...scenario.goals };
  return {
    id,
    scenarioId: scenario.id,
    settings,
    maxTurns: rules.maxTurns,
    tokensTotal: rules.tokens,
    turn: 1,
    status: "active",
    tokensLeft: rules.tokens,
    trust: 60,
    points: 0,
    lastDelta: null,
    supplierOffer: offer,
    position,
    tableOwner: "supplier",
    changed: [...CONDITION_IDS],
    agreed: agreedOf(offer, position),
    cardsLeft,
    motives: motives.map((motive) => ({ id: motive.id, title: motive.title, short: motive.short, revealed: false })),
    learned: null,
    journal: [{ turn: 0, who: "supplier", start: true, text: packageLine(offer) }],
    reply: { turn: 1, label: "Ход 1 · стартовое предложение", text: scenario.openingLine },
    dealReady: false,
    acceptedPackage: null,
    lastProposal: null,
    concessions: [],
    moves: [],
    askedQuestions: [],
    usedCriteria: [],
    startedAt: new Date().toISOString(),
    elapsedSec: 0,
  };
}

function agreedOf(offer: Package, position: Package) {
  return CONDITION_IDS.filter((id) => offer[id] === position[id]);
}

function changedBetween(before: Package, after: Package) {
  return CONDITION_IDS.filter((id) => before[id] !== after[id]);
}

function objectionLine(objection: Objection) {
  return objection.text.charAt(0).toUpperCase() + objection.text.slice(1);
}

interface Effects {
  trust: number;
  points: number;
  reason: string;
}

function revealMotive(state: TableState, motive: MotiveDef, source: string) {
  const current = state.motives.find((item) => item.id === motive.id);
  if (!current || current.revealed) return false;
  current.revealed = true;
  current.text = motive.text;
  current.source = source;
  current.turn = state.turn;
  state.learned = { title: motive.title, text: motive.text, source: `${source} · ход ${state.turn}` };
  return true;
}

function motiveOf(objection: Objection | undefined) {
  return objection?.motive ? motives.find((motive) => motive.id === objection.motive) ?? null : null;
}

/** Validates a move against the rules visible to the participant. */
export function validateMove(state: TableState, move: Move) {
  if (state.status !== "active") throw new MoveError("Тренировка уже завершена");
  if (state.turn > state.maxTurns) throw new MoveError("Ходы закончились");
  if (!cards.some((card) => card.id === move.card)) throw new MoveError("Неизвестная карта", 400);
  if (state.cardsLeft[move.card] <= 0) throw new MoveError(`Карта «${cardById(move.card).title}» закончилась`);
  const inRange = (pkg: Package) => CONDITION_IDS.every((id) => Number.isInteger(pkg[id]) && pkg[id] >= 0 && pkg[id] < conditions[id].options.length);
  switch (move.card) {
    case "question":
      if (!questions.some((question) => question.id === move.questionId)) throw new MoveError("Неизвестный вопрос", 400);
      break;
    case "criterion":
      if (!criteria.some((criterion) => criterion.id === move.criterionId)) throw new MoveError("Неизвестный критерий", 400);
      if (state.usedCriteria.includes(move.criterionId)) throw new MoveError("Этот критерий уже использован");
      break;
    case "anchor":
      if (!move.pkg || !inRange(move.pkg)) throw new MoveError("Пакет заполнен не полностью", 400);
      break;
    case "package": {
      if (!move.pkg || !inRange(move.pkg)) throw new MoveError("Пакет заполнен не полностью", 400);
      if (tokenCost(state.position, move.pkg) > state.tokensLeft) throw new MoveError("Не хватает жетонов уступок");
      if (redLineIssues(move.pkg).length && !move.confirmRedLine) throw new MoveError("Пакет нарушает красную линию — подтвердите отправку");
      break;
    }
    case "concession": {
      const valid = (id: ConditionId, index: number) => CONDITION_IDS.includes(id) && Number.isInteger(index) && index >= 0 && index < conditions[id].options.length;
      if (!valid(move.give, move.giveIndex) || !valid(move.ask, move.askIndex) || move.give === move.ask) throw new MoveError("Выберите, что отдаёте и что просите взамен", 400);
      if (state.tokensLeft <= 0) throw new MoveError("Жетоны уступок закончились");
      if (tokenCost(state.position, { [move.give]: move.giveIndex }) > state.tokensLeft) throw new MoveError("Не хватает жетонов уступок");
      break;
    }
    case "summary":
      if (!state.dealReady || !state.acceptedPackage) throw new MoveError("Резюме доступно после принятого пакета");
      break;
  }
}

/** Applies one move. Mutates and returns a copy of the state with the supplier's decision. */
export function applyMove(previous: TableState, move: Move): { state: TableState; decision: Decision; userLine: string } {
  validateMove(previous, move);
  const state: TableState = structuredClone(previous);
  const difficulty = state.settings.difficulty;
  const turn = state.turn;
  const offerBefore = { ...state.supplierOffer };
  const tokensBefore = state.tokensLeft;
  let effects: Effects = { trust: 0, points: 0, reason: "" };
  let decision: Decision;
  const userLine = moveLine(previous, move);
  const userJournal = moveJournal(previous, move);
  let outcome: MoveRecord["outcome"] = "info";
  let change = "";
  let redLineViolated = false;

  const addConcessions = (before: Package, after: Package, conditional: boolean, via: CardId, exchange: string, ask: ConcessionRecord["ask"]) => {
    for (const id of worsened(before, after)) {
      const record: ConcessionRecord = { turn, condition: id, from: before[id], to: after[id], conditional, via, exchange, ask };
      state.concessions.push(record);
    }
  };

  switch (move.card) {
    case "question": {
      const question = questions.find((item) => item.id === move.questionId)!;
      const motiveId = questionMotive[question.id];
      const motive = motiveId ? motives.find((item) => item.id === motiveId)! : null;
      const repeated = state.askedQuestions.includes(question.id);
      state.askedQuestions.push(question.id);
      if (motive && revealMotive(state, motive, "открыто вашим вопросом")) {
        effects = { trust: 8, points: 18, reason: "вы уточнили интерес поставщика" };
        decision = { kind: "motive", line: motive.answer, journal: motive.journal, facts: [motive.text], label: `Ход ${turn} · ответ` };
        outcome = "motive";
        change = motive.title.toLowerCase();
      } else if (!motive) {
        state.learned = { title: warrantyFact.title, text: warrantyFact.text, source: `открыто вашим вопросом · ход ${turn}` };
        effects = repeated ? { trust: -2, points: 0, reason: "вопрос уже задавали" } : { trust: 4, points: 6, reason: "вы уточнили условие поставщика" };
        decision = { kind: "info", line: warrantyFact.answer, journal: warrantyFact.journal, facts: [warrantyFact.text], label: `Ход ${turn} · ответ` };
        change = "условия гарантии";
      } else {
        effects = { trust: -2, points: 0, reason: "мотив уже открыт" };
        decision = { kind: "info", line: `Я уже говорил: ${lowerFirst(motive.answer)}`, journal: motive.journal, facts: [motive.text], label: `Ход ${turn} · ответ` };
        change = motive.title.toLowerCase();
      }
      break;
    }

    case "anchor": {
      const pkg = move.pkg;
      state.position = { ...pkg };
      state.lastProposal = { ...pkg };
      change = describeProposal(pkg);
      const issues = objections(pkg, difficulty);
      if (redLineIssues(pkg).length) redLineViolated = true;
      if (issues.length === 0) {
        state.dealReady = true;
        state.acceptedPackage = { ...pkg };
        state.supplierOffer = { ...pkg };
        effects = { trust: 6, points: 15, reason: "поставщик принял ваш пакет" };
        decision = { kind: "accept", line: `Такой пакет мы можем принять: ${offerSentence(pkg)}.`, journal: "Пакет принят", facts: [offerSentence(pkg)], label: `Ход ${turn} · принято` };
        outcome = "accepted";
      } else {
        const main = issues.find((item) => item.motive && !state.motives.find((motive) => motive.id === item.motive)?.revealed) ?? issues[0];
        const motive = motiveOf(main);
        const revealed = motive ? revealMotive(state, motive, "открыто вашим якорем") : false;
        effects = { trust: 0, points: 4, reason: revealed ? "якорь открыл ограничение" : "вы первым назвали пакет" };
        decision = {
          kind: revealed ? "motive" : "reject",
          line: revealed && motive ? motive.answer : `${objectionLine(main)}. Наше предложение пока в силе.`,
          journal: revealed && motive ? motive.journal : objectionLine(main),
          facts: [main.text],
          label: `Ход ${turn} · ответ`,
        };
        outcome = revealed ? "motive" : "rejected";
      }
      if (redLineViolated) effects = { trust: effects.trust, points: effects.points - 15, reason: "якорь за красной линией" };
      break;
    }

    case "criterion": {
      const criterion = criteria.find((item) => item.id === move.criterionId)!;
      state.usedCriteria.push(criterion.id);
      change = lowerFirst(criterion.label);
      const offer = state.supplierOffer;
      if (criterion.id === "budget") {
        if (sumOf(offer) > BUDGET) {
          const next = repair(offer, ["term", "payment", "warranty"], difficulty, (pkg) => sumOf(pkg) <= BUDGET) ?? offer;
          state.supplierOffer = next;
          effects = { trust: 4, points: 6, reason: "вы опёрлись на критерий" };
          decision = {
            kind: "criterion",
            line: `Понимаю рамку бюджета. Тогда можем говорить о ${optionOf("qty", next.qty).value} мониторах по ${optionOf("price", next.price).pill} — это ${formatMoney(sumOf(next))} ₽.`,
            journal: `${optionOf("qty", next.qty).short} по ${optionOf("price", next.price).short} — в бюджете`,
            facts: [`${optionOf("qty", next.qty).value} шт. × ${optionOf("price", next.price).pill} = ${formatMoney(sumOf(next))} ₽`],
            label: `Ход ${turn} · ответ`,
          };
          outcome = "countered";
        } else {
          effects = { trust: 2, points: 2, reason: "предложение уже в бюджете" };
          decision = { kind: "info", line: `Наше предложение уже укладывается в бюджет: ${formatMoney(sumOf(offer))} ₽.`, journal: "Предложение уже в бюджете", facts: [], label: `Ход ${turn} · ответ` };
        }
      } else if (criterion.id === "deadline") {
        const motive = motives.find((item) => item.id === "production")!;
        const revealed = revealMotive(state, motive, "открыто вашим критерием");
        if (offer.term === 2) {
          const next = { ...offer, term: 1 };
          state.supplierOffer = acceptable(next, difficulty) ? next : offer;
        }
        effects = { trust: 4, points: revealed ? 12 : 6, reason: revealed ? "критерий открыл ограничение" : "вы опёрлись на критерий" };
        decision = {
          kind: "criterion",
          line: "Раз офис открывается через три недели, две недели мы обеспечим. Быстрее — только с полной предоплатой: это перестройка графика производства.",
          journal: "Срок 14 дней — обычный; быстрее только с предоплатой",
          facts: ["14 дней — обычный срок производства", motive.text],
          label: `Ход ${turn} · ответ`,
        };
        outcome = revealed ? "motive" : "countered";
      } else {
        const next = { ...offer };
        if (next.price === 2) next.price = 1;
        if (next.warranty === 2) next.warranty = 1;
        const safe = acceptable(next, difficulty) ? next : repair(next, ["price"], difficulty) ?? offer;
        state.supplierOffer = safe;
        effects = { trust: 2, points: 6, reason: "вы сравнили с альтернативой" };
        decision = {
          kind: "criterion",
          line: `Понимаю. Можем выйти на ${optionOf("price", safe.price).pill} и гарантию ${optionOf("warranty", safe.warranty).value} месяца, но часть оплаты нам нужна до поставки.`,
          journal: `${optionOf("price", safe.price).short} и ${optionOf("warranty", safe.warranty).short} — ответ на альтернативу`,
          facts: [],
          label: `Ход ${turn} · ответ`,
        };
        outcome = "countered";
      }
      break;
    }

    case "concession": {
      const { give, giveIndex, ask, askIndex } = move;
      const proposal: Package = { ...state.supplierOffer, [give]: giveIndex, [ask]: askIndex };
      const cost = tokenCost(state.position, { [give]: giveIndex });
      change = `${optionOf(give, state.position[give]).short} → ${optionOf(give, giveIndex).short}, если ${optionOf(ask, askIndex).short}`;
      if (redLineIssues({ ...state.position, [give]: giveIndex }).length) redLineViolated = true;
      const exchange = `→ ${lowerFirst(conditions[ask].title)} ${optionOf(ask, askIndex).short}`;
      if (acceptable(proposal, difficulty)) {
        const before = { ...state.position };
        state.position = { ...state.position, [give]: giveIndex };
        state.tokensLeft -= cost;
        state.supplierOffer = proposal;
        addConcessions(before, state.position, true, "concession", exchange, ask);
        effects = { trust: 10, points: 10, reason: "обмен на встречный шаг" };
        decision = {
          kind: "accept",
          line: `Договорились: ${nomPhrase(give, giveIndex)} при ${askPhrase(ask, askIndex)}. Остальное пока как в нашем предложении.`,
          journal: `${optionOf(give, giveIndex).short} при ${optionOf(ask, askIndex).short} — принято`,
          facts: [offerSentence(proposal)],
          label: `Ход ${turn} · ответ`,
        };
        outcome = "accepted";
      } else {
        const counter = repair(proposal, [give, ask], difficulty);
        const blocking = objections(proposal, difficulty);
        if (counter) {
          const before = { ...state.position };
          state.position = { ...state.position, [give]: giveIndex };
          state.tokensLeft -= cost;
          state.supplierOffer = counter;
          addConcessions(before, state.position, true, "concession", exchange, ask);
          const extra = changedBetween(proposal, counter).map((id) => condPhrase(id, counter[id]));
          const motive = motiveOf(blocking[0]);
          if (motive) revealMotive(state, motive, "открыто вашей уступкой");
          effects = { trust: 6, points: 6, reason: "обмен со встречным условием" };
          decision = {
            kind: "counter",
            line: `${optionOf(give, giveIndex).short} по ${optionOf(ask, askIndex).short} — ${extra.length ? `при ${extra.join(" и ")}` : "подходит"}. ${blocking[0] ? objectionLine(blocking[0]) + "." : ""}`.trim(),
            journal: `${optionOf(give, giveIndex).short} по ${optionOf(ask, askIndex).short} — при ${extra.join(" и ") || "тех же условиях"}`,
            facts: [offerSentence(counter), ...blocking.map((item) => item.text)],
            label: `Ход ${turn} · ответ`,
          };
          outcome = "countered";
        } else {
          const motive = motiveOf(blocking[0]);
          if (motive) revealMotive(state, motive, "открыто вашей уступкой");
          effects = { trust: -2, points: 0, reason: "обмен не подошёл поставщику" };
          decision = {
            kind: "reject",
            line: `Так не получится: ${blocking[0] ? lowerFirst(blocking[0].text) : "это ниже нашей границы"}. Предложите другой обмен.`,
            journal: `Отказ: ${blocking[0]?.text ?? "обмен не подходит"}`,
            facts: blocking.map((item) => item.text),
            label: `Ход ${turn} · ответ`,
          };
          outcome = "rejected";
        }
      }
      if (redLineViolated) effects = { ...effects, points: effects.points - 15, reason: "уступка за красной линией" };
      break;
    }

    case "package": {
      const pkg = move.pkg;
      const before = { ...state.position };
      const cost = tokenCost(before, pkg);
      state.position = { ...pkg };
      state.lastProposal = { ...pkg };
      state.tokensLeft -= cost;
      change = `${describeProposal(pkg)} · сумма ${formatMoney(sumOf(pkg))} ₽`;
      redLineViolated = redLineIssues(pkg).length > 0;
      const blocking = objections(pkg, difficulty);
      if (blocking.length === 0) {
        state.dealReady = true;
        state.acceptedPackage = { ...pkg };
        state.supplierOffer = { ...pkg };
        addConcessions(before, pkg, true, "package", "→ итоговый пакет принят", "package");
        effects = { trust: 6, points: 15, reason: "поставщик принял пакет" };
        decision = { kind: "accept", line: `Такой пакет мы можем принять: ${offerSentence(pkg)}.`, journal: "Пакет принят", facts: [offerSentence(pkg)], label: `Ход ${turn} · принято` };
        outcome = "accepted";
      } else {
        const counter = repair(pkg, [], difficulty) ?? state.supplierOffer;
        const gained = CONDITION_IDS.some((id) => counter[id] < offerBefore[id]);
        addConcessions(before, pkg, gained, "package", gained ? "→ встречный пакет поставщика" : "ничего взамен", gained ? "package" : null);
        state.supplierOffer = counter;
        const motive = motiveOf(blocking[0]);
        const revealed = motive ? revealMotive(state, motive, "открыто вашим пакетом") : false;
        const freeGiven = !gained && cost > 0;
        effects = freeGiven
          ? { trust: -8, points: -8, reason: "уступка без встречного условия" }
          : { trust: 2, points: revealed ? 10 : 5, reason: revealed ? "пакет открыл ограничение" : "встречный пакет поставщика" };
        decision = {
          kind: "counter",
          line: `Такой пакет близок, но ${lowerFirst(blocking[0].text)}. Можем так: ${offerSentence(counter)}.`,
          journal: `Встречный пакет: ${describeProposal(counter)}`,
          facts: [offerSentence(counter), ...blocking.map((item) => item.text)],
          label: `Ход ${turn} · ответ`,
        };
        outcome = "countered";
      }
      if (redLineViolated) effects = { ...effects, points: effects.points - 15, reason: "пакет за красной линией" };
      break;
    }

    case "summary": {
      const pkg = state.acceptedPackage!;
      change = "договорённость подтверждена";
      state.status = "deal";
      state.endReason = "deal";
      state.endedAt = new Date().toISOString();
      effects = { trust: 5, points: 3, reason: "вы зафиксировали договорённость" };
      decision = { kind: "deal", line: "Договорились. Готовлю договор на этих условиях и пришлю сегодня.", journal: "Сделка — договор на этих условиях", facts: [offerSentence(pkg)], label: `Ход ${turn} · принято` };
      outcome = "deal";
      break;
    }
  }

  // ---------- bookkeeping ----------
  state.cardsLeft[move.card] -= 1;
  state.trust = clamp(state.trust + effects.trust);
  state.points = clamp(state.points + effects.points);
  state.lastDelta = { trust: effects.trust, points: effects.points, reason: effects.reason };
  state.changed = changedBetween(offerBefore, state.supplierOffer);
  state.agreed = state.dealReady && state.acceptedPackage && samePackage(state.acceptedPackage, state.supplierOffer)
    ? [...CONDITION_IDS]
    : agreedOf(state.supplierOffer, state.position);
  state.tableOwner = "supplier";
  state.journal.push({ turn, who: "you", text: userJournal });
  state.journal.push({ turn, who: "supplier", text: decision!.journal });
  state.reply = { turn, label: decision!.label, text: decision!.line };
  state.moves.push({
    turn,
    card: move.card,
    change,
    tokensBefore,
    tokensAfter: state.tokensLeft,
    trustDelta: effects.trust,
    pointsDelta: effects.points,
    reaction: decision!.journal,
    outcome,
    userLine,
    supplierLine: decision!.line,
    redLineViolated,
  });
  state.turn += 1;
  if (state.status === "active" && state.turn > state.maxTurns) {
    state.status = state.dealReady ? "deal" : "no_deal";
    state.endReason = "turns";
    state.endedAt = new Date().toISOString();
  }
  return { state, decision: decision!, userLine };
}

function askPhrase(id: ConditionId, index: number) {
  const option = optionOf(id, index);
  switch (id) {
    case "price": return `цене ${option.pill}`;
    case "qty": return `заказе ${option.pill}`;
    case "term": return `сроке ${option.pill}`;
    case "payment": return `оплате ${option.short}`;
    case "warranty": return `гарантии ${option.pill}`;
  }
}

function nomPhrase(id: ConditionId, index: number) {
  const option = optionOf(id, index);
  switch (id) {
    case "price": return `цена ${option.pill}`;
    case "qty": return `${option.value} мониторов`;
    case "term": return `срок ${option.pill}`;
    case "payment": return `оплата ${option.short}`;
    case "warranty": return `гарантия ${option.value} месяцев`;
  }
}

function condPhrase(id: ConditionId, index: number) {
  const option = optionOf(id, index);
  switch (id) {
    case "price": return `цене ${option.pill}`;
    case "qty": return `заказе от ${option.pill}`;
    case "term": return index === 1 ? "14 днях" : index === 0 ? "7 днях" : "21 дне";
    case "payment": return index === 2 ? "полном авансе" : index === 1 ? "авансе 50/50" : "отсрочке";
    case "warranty": return `гарантии ${option.pill}`;
  }
}

export function finishManually(previous: TableState): TableState {
  const state = structuredClone(previous);
  if (state.status === "active") {
    state.status = "aborted";
    state.endReason = "manual";
    state.endedAt = new Date().toISOString();
  }
  return state;
}
