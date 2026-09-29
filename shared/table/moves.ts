// Wording of the participant's moves. Shared: the client shows the move in the journal
// right away (while the supplier «thinks»), the server stores the same text.
import { CONDITION_IDS, conditions, criteria, formatMoney, optionOf, packageLine, questions, scenario, sumOf } from "./scenario";
import type { ConditionId, Move, Package, TableState } from "./types";

const lowerFirst = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

export function giveText(id: ConditionId, index: number) {
  const option = optionOf(id, index);
  switch (id) {
    case "price": return `поднять цену до ${option.pill}`;
    case "qty": return `увеличить заказ до ${option.value} штук`;
    case "term": return `подождать поставку ${option.pill}`;
    case "payment": return index === 1 ? "перейти на оплату 50/50" : index === 2 ? "внести полную предоплату" : "перейти на отсрочку 30 дней";
    case "warranty": return `согласиться на гарантию ${option.value} месяцев`;
  }
}

export function askText(id: ConditionId, index: number) {
  const option = optionOf(id, index);
  switch (id) {
    case "price": return `снизите цену до ${option.pill}`;
    case "qty": return `примете заказ на ${option.value} штук`;
    case "term": return `поставите за ${option.pill}`;
    case "payment": return index === 0 ? "дадите отсрочку 30 дней" : index === 1 ? "согласитесь на оплату 50/50" : "оставите полную предоплату";
    case "warranty": return `дадите гарантию ${option.value} месяцев`;
  }
}

export function keepText(id: ConditionId, index: number) {
  const option = optionOf(id, index);
  switch (id) {
    case "price": return `сохраните цену ${option.pill}`;
    case "qty": return `сохраните объём ${option.pill}`;
    case "term": return `сохраните срок ${option.pill}`;
    case "payment": return `сохраните оплату ${option.short}`;
    case "warranty": return `сохраните гарантию ${option.value} месяца`;
  }
}

/** Conditions the participant keeps in a conditional concession: the supplier already meets the goal there. */
export function keptConditions(state: Pick<TableState, "supplierOffer" | "position">, give: ConditionId, ask: ConditionId) {
  return CONDITION_IDS.filter((id) => id !== give && id !== ask && state.supplierOffer[id] === scenario.goals[id] && state.position[id] === scenario.goals[id]);
}

export function concessionLine(state: Pick<TableState, "supplierOffer" | "position">, give: ConditionId, giveIndex: number, ask: ConditionId, askIndex: number) {
  const keeps = keptConditions(state, give, ask);
  const ending = keeps.length ? ` и ${keeps.map((id) => keepText(id, state.supplierOffer[id])).join(" и ")}` : "";
  return `«Мы готовы ${giveText(give, giveIndex)}, если вы ${askText(ask, askIndex)}${ending}».`;
}

export function offerSentence(pkg: Package) {
  const price = optionOf("price", pkg.price).pill;
  const qty = optionOf("qty", pkg.qty).value;
  const term = pkg.term === 1 ? "две недели" : pkg.term === 0 ? "семь дней" : "21 день";
  const payment = pkg.payment === 2 ? "оплата полностью авансом" : pkg.payment === 1 ? "оплата 50/50" : "оплата через 30 дней";
  const warranty = `гарантия ${optionOf("warranty", pkg.warranty).value} месяцев`;
  return `${qty} мониторов по ${price}, ${term}, ${payment}, ${warranty}`;
}

export function describeProposal(pkg: Package) {
  return packageLine(pkg).replace(" ₽", "");
}

/** Full sentence of the participant for the move («Ваша реплика»). */
export function moveLine(state: Pick<TableState, "supplierOffer" | "position" | "acceptedPackage">, move: Move) {
  switch (move.card) {
    case "question": return `«${questions.find((item) => item.id === move.questionId)?.line ?? ""}»`;
    case "criterion": return `«${criteria.find((item) => item.id === move.criterionId)?.line ?? ""}»`;
    case "anchor": return `«Предлагаю так: ${offerSentence(move.pkg)}».`;
    case "package": return `«Предлагаю пакет: ${offerSentence(move.pkg)}. Итого ${formatMoney(sumOf(move.pkg))} ₽».`;
    case "concession": return concessionLine(state, move.give, move.giveIndex, move.ask, move.askIndex);
    case "summary": {
      const pkg = state.acceptedPackage ?? state.supplierOffer;
      return `«Договорились: ${optionOf("qty", pkg.qty).value} мониторов по ${optionOf("price", pkg.price).pill}, поставка за ${optionOf("term", pkg.term).pill}, оплата — ${pkg.payment === 1 ? "50% аванс и 50% после поставки" : pkg.payment === 2 ? "полная предоплата" : "через 30 дней"}, гарантия ${optionOf("warranty", pkg.warranty).value} месяца. Итого ${formatMoney(sumOf(pkg))} ₽».`;
    }
  }
}

/** Short journal line of the participant's move. */
export function moveJournal(state: Pick<TableState, "supplierOffer" | "position">, move: Move) {
  switch (move.card) {
    case "question": return `Вопрос: ${lowerFirst(questions.find((item) => item.id === move.questionId)?.label ?? "")}`;
    case "criterion": return `Критерий: ${lowerFirst((criteria.find((item) => item.id === move.criterionId)?.label ?? "").split(":")[0])}`;
    case "anchor": return `Якорь: ${describeProposal(move.pkg)}`;
    case "package": return `Пакет: ${describeProposal(move.pkg)}`;
    case "concession": {
      const keeps = keptConditions(state, move.give, move.ask).map((id) => optionOf(id, state.supplierOffer[id]).short);
      const ask = `${optionOf(move.ask, move.askIndex).short}${move.ask === "price" ? " ₽" : ""}`;
      return `${optionOf(move.give, move.giveIndex).short}, если ${[ask, ...keeps].join(" и ")}`;
    }
    case "summary": return "Резюме: договорённость подтверждена";
  }
}

export function conditionTitleLower(id: ConditionId) {
  return lowerFirst(conditions[id].title);
}
