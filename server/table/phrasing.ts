// YandexGPT phrases the supplier's line. The decision itself (numbers, acceptance, motives) comes
// from the engine; a model answer that invents numbers is discarded in favour of the rule line.
import { scenario } from "../../shared/table/scenario";
import type { TableState } from "../../shared/table/types";
import type { Decision } from "./engine";
import { CHAT_MODEL, complete, parseModelJson } from "./yandex";

const numbersIn = (text: string) => (text.match(/\d[\d\s]*(?:[.,]\d+)?/g) ?? []).map((value) => value.replace(/\s/g, "").replace(",", "."));

function sameNumbers(candidate: string, allowedSource: string) {
  const allowed = new Set(numbersIn(allowedSource));
  // «две недели», «семь дней» written with words are fine; digits must come from the rule line or the table.
  return numbersIn(candidate).every((value) => allowed.has(value));
}

function history(state: TableState) {
  return state.journal.slice(-8).map((entry) => `${entry.who === "you" ? "Покупатель" : "Андрей"}: ${entry.text}`).join("\n");
}

export async function phraseSupplier(state: TableState, decision: Decision, userLine: string): Promise<string> {
  if (process.env.PHRASING === "off") return decision.line;
  const system = `Ты — ${scenario.supplierName}, поставщик мониторов, в учебной мини-игре «Стол переговоров». Говоришь деловым, спокойным тоном, по существу.
Перефразируй заготовленную реплику живой разговорной речью. Правила:
- смысл, условия и все числа должны остаться теми же; не добавляй новых чисел, скидок, сроков и обещаний;
- не раскрывай больше, чем в заготовке, не давай советов и не оценивай покупателя;
- 1–2 предложения, до 40 слов, без списков, без кавычек и ремарок;
- верни только JSON: {"reply": "реплика"}.`;
  const user = `История ходов:\n${history(state)}\n\nПоследний ход покупателя: ${userLine}\nЗаготовленная реплика поставщика: ${decision.line}\nФакты, которые должны сохраниться: ${decision.facts.join("; ") || "нет"}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const { text } = await complete(
      [{ role: "system", content: system }, { role: "user", content: user }],
      { model: CHAT_MODEL, temperature: 0.4, maxTokens: 220, signal: controller.signal },
    );
    const parsed = parseModelJson(text);
    const reply = typeof parsed.reply === "string" ? parsed.reply.replace(/^["«]|["»]$/g, "").replace(/\s+/g, " ").trim() : "";
    if (reply.length < 12 || reply.length > 320) return decision.line;
    if (!sameNumbers(reply, `${decision.line} ${decision.facts.join(" ")}`)) return decision.line;
    // Terms of an agreement or a counter-offer must survive the rephrasing in full.
    if (["accept", "counter", "criterion", "deal"].includes(decision.kind)) {
      const got = new Set(numbersIn(reply));
      if (!numbersIn(decision.line).every((value) => got.has(value))) return decision.line;
    }
    return reply;
  } catch {
    // The rule line is always correct: the game never stops because the model is slow.
    return decision.line;
  } finally {
    clearTimeout(timer);
  }
}
