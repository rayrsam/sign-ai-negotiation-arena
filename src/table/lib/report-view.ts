// Numbers and phrases shown in the reports; everything is derived from the finished table.
import { BUDGET, conditions, formatMoney, optionOf, redLineIssues, scenario, sumOf } from "../../../shared/table/scenario";
import type { ConditionId, Package, TableState } from "../../../shared/table/types";

const shortName: Record<ConditionId, string> = { price: "цена", qty: "объём", term: "срок", payment: "аванс", warranty: "гарантия" };

export interface TokenUse {
  index: number;
  state: "conditional" | "free" | "unused";
  caption: string;
  turn?: number;
}

/** One entry per concession token (a two-step concession spends two tokens). */
export function tokenUses(state: TableState): TokenUse[] {
  const uses: TokenUse[] = [];
  for (const item of [...state.concessions].sort((a, b) => a.turn - b.turn)) {
    for (let step = item.from; step < item.to; step += 1) {
      const target = item.ask === "package" ? "пакет" : item.ask ? shortName[item.ask] : "";
      uses.push({
        index: uses.length + 1,
        state: item.conditional ? "conditional" : "free",
        caption: item.conditional ? `${shortName[item.condition]} → ${target || "обмен"}` : "бесплатно",
        turn: item.turn,
      });
    }
  }
  while (uses.length < state.tokensTotal) uses.push({ index: uses.length + 1, state: "unused", caption: "не потрачена" });
  return uses.slice(0, Math.max(state.tokensTotal, uses.length));
}

export function finalPackage(state: TableState): Package {
  return state.acceptedPackage ?? state.lastProposal ?? state.position;
}

export function packageFormula(pkg: Package) {
  return `${optionOf("price", pkg.price).pill} × ${optionOf("qty", pkg.qty).pill} = ${formatMoney(sumOf(pkg))} ₽ · ${optionOf("term", pkg.term).short} · ${optionOf("payment", pkg.payment).short} · ${optionOf("warranty", pkg.warranty).short}`;
}

export function lastOfferLine(pkg: Package) {
  return `${optionOf("price", pkg.price).pill} × ${optionOf("qty", pkg.qty).pill} · ${optionOf("term", pkg.term).short} · ${optionOf("payment", pkg.payment).short} · ${optionOf("warranty", pkg.warranty).short}`;
}

/** «Сделка лучше: срок 14 дней вместо 21, цена 44 000 ₽ вместо 46 000 ₽». */
export function backupComparison(state: TableState) {
  const backup = scenario.backup;
  if (state.status !== "deal" || !state.acceptedPackage) {
    return `Остаётся ${optionOf("price", backup.price).pill} за ${optionOf("term", backup.term).short}. Предложение поставщика было ближе к нему, чем кажется.`;
  }
  const pkg = state.acceptedPackage;
  const better: string[] = [];
  const worse: string[] = [];
  if (pkg.term !== backup.term) (pkg.term < backup.term ? better : worse).push(`срок ${optionOf("term", pkg.term).short} вместо ${optionOf("term", backup.term).value}`);
  if (pkg.price !== backup.price) (pkg.price < backup.price ? better : worse).push(`цена ${optionOf("price", pkg.price).pill} вместо ${optionOf("price", backup.price).pill}`);
  if (pkg.warranty !== backup.warranty) (pkg.warranty < backup.warranty ? better : worse).push(`гарантия ${optionOf("warranty", pkg.warranty).short}`);
  if (better.length && !worse.length) return `Сделка лучше: ${better.join(", ")}.`;
  if (better.length) return `Сделка лучше: ${better.join(", ")}; уступили: ${worse.join(", ")}.`;
  return `Сделка не лучше запасного варианта (${formatMoney(sumOf(backup))} ₽) — сравнивайте до отправки пакета.`;
}

export function redLinesKept(state: TableState) {
  return !state.moves.some((move) => move.redLineViolated) && redLineIssues(finalPackage(state)).length === 0;
}

export function budgetNote(pkg: Package) {
  return sumOf(pkg) <= BUDGET;
}

export { conditions, shortName };
