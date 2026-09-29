// Public part of the «Стол переговоров» scenario and the participant-side rules
// (sum, tokens, red lines). The supplier's hidden card lives in server/supplier-card.ts.
import type { CardId, ConditionId, Difficulty, MethodId, Package, TrainingSettings } from "./types";

export interface OptionDef {
  /** Big value on the table chip: «48 000 ₽». */
  chip: string;
  /** Caption under the chip value: «за единицу». */
  unit: string;
  /** Pill text in the card dialogs: «48 000 ₽». */
  pill: string;
  /** Compact form for the journal and reports: «48 000». */
  short: string;
  /** Numeric value used in calculations. */
  value: number;
}

export interface ConditionDef {
  id: ConditionId;
  title: string;
  head: string;
  /** Options from the best for the participant to the worst. */
  options: OptionDef[];
  goal: number;
  goalLabel: string;
  /** Options with an index above this one are beyond the participant's red line. */
  redLine?: number;
}

export const CONDITION_IDS: ConditionId[] = ["price", "qty", "term", "payment", "warranty"];

export const conditions: Record<ConditionId, ConditionDef> = {
  price: {
    id: "price",
    title: "Цена",
    head: "цена",
    options: [
      { chip: "44 000 ₽", unit: "за единицу", pill: "44 000 ₽", short: "44 000", value: 44000 },
      { chip: "46 000 ₽", unit: "за единицу", pill: "46 000 ₽", short: "46 000", value: 46000 },
      { chip: "48 000 ₽", unit: "за единицу", pill: "48 000 ₽", short: "48 000", value: 48000 },
    ],
    goal: 0,
    goalLabel: "цель 44 000",
  },
  qty: {
    id: "qty",
    title: "Количество",
    head: "количество",
    options: [
      { chip: "100 шт.", unit: "мониторов", pill: "100 шт.", short: "100 шт.", value: 100 },
      { chip: "120 шт.", unit: "мониторов", pill: "120 шт.", short: "120 шт.", value: 120 },
      { chip: "150 шт.", unit: "мониторов", pill: "150 шт.", short: "150 шт.", value: 150 },
    ],
    goal: 0,
    goalLabel: "цель 100",
  },
  term: {
    id: "term",
    title: "Срок",
    head: "срок",
    options: [
      { chip: "7 дней", unit: "поставка", pill: "7 дней", short: "7 дней", value: 7 },
      { chip: "14 дней", unit: "поставка", pill: "14 дней", short: "14 дней", value: 14 },
      { chip: "21 день", unit: "поставка", pill: "21 день", short: "21 день", value: 21 },
    ],
    goal: 0,
    goalLabel: "цель 7 дней",
  },
  payment: {
    id: "payment",
    title: "Оплата",
    head: "оплата",
    options: [
      { chip: "30 дней", unit: "отсрочка", pill: "30 дней", short: "через 30 дней", value: 0 },
      { chip: "50/50", unit: "аванс и после", pill: "50/50", short: "50/50", value: 50 },
      { chip: "100%", unit: "предоплата", pill: "100%", short: "100% аванс", value: 100 },
    ],
    goal: 0,
    goalLabel: "цель через 30 дней",
  },
  warranty: {
    id: "warranty",
    title: "Гарантия",
    head: "гарантия",
    options: [
      { chip: "36 мес.", unit: "гарантия", pill: "36 мес.", short: "36 мес.", value: 36 },
      { chip: "24 мес.", unit: "гарантия", pill: "24 мес.", short: "24 мес.", value: 24 },
      { chip: "12 мес.", unit: "гарантия", pill: "12 мес.", short: "12 мес.", value: 12 },
    ],
    goal: 1,
    goalLabel: "минимум 24 мес.",
    redLine: 1,
  },
};

export const BUDGET = 5_500_000;

export const scenario = {
  id: "office-monitors",
  title: "Поставка для нового офиса",
  topic: "Закупки и поставка",
  role: "Покупатель · менеджер по закупкам",
  supplierName: "Андрей",
  supplierRole: "поставщик",
  /** What the supplier puts on the table before the first move. */
  startOffer: { price: 2, qty: 2, term: 2, payment: 2, warranty: 2 } as Package,
  goals: { price: 0, qty: 0, term: 0, payment: 0, warranty: 1 } as Package,
  /** The backup offer of another supplier (the participant's alternative). */
  backup: { price: 1, qty: 0, term: 2, payment: 1, warranty: 1 } as Package,
  openingLine:
    "Мы можем поставить мониторы по 48 000 ₽ при заказе 150 штук. Срок — 21 день, оплата полностью авансом, гарантия — 12 месяцев.",
  brief: {
    role: "Вы — менеджер по закупкам компании, которая открывает новый офис. Можете согласовать закупку в пределах бюджета.",
    situation:
      "Компании нужны мониторы для нового офиса. Поставщик прислал стартовое предложение: 48 000 ₽ за штуку при заказе 150 штук, срок 21 день, полная предоплата, гарантия 12 месяцев.",
    task: "Договориться о поставке, которая укладывается в бюджет и не нарушает ваши красные линии, — и отдавать каждую уступку только в обмен.",
    facts: [
      "Офису нужно 100 мониторов, запас допустим",
      "Бюджет закупки — 5 500 000 ₽",
      "Гарантия — не меньше 24 месяцев",
      "Запасной вариант: 46 000 ₽ · 100 шт. · 21 день · 50/50 · 24 мес.",
    ],
  },
};

export interface CardDef {
  id: CardId;
  key: number;
  title: string;
  titleLines?: [string, string];
  description: string;
  descriptionLines: string[];
  limit: number;
}

export const cards: CardDef[] = [
  { id: "question", key: 1, title: "Вопрос", description: "Узнать интерес или ограничение", descriptionLines: ["Узнать интерес или", "ограничение"], limit: 3 },
  { id: "anchor", key: 2, title: "Якорь", description: "Первым назвать свой пакет", descriptionLines: ["Первым назвать свой", "пакет"], limit: 1 },
  { id: "criterion", key: 3, title: "Критерий", description: "Обосновать бюджетом, сроком или альтернативой", descriptionLines: ["Обосновать", "бюджетом, сроком", "или альтернативой"], limit: 2 },
  { id: "concession", key: 4, title: "Уступка при условии", titleLines: ["Уступка при", "условии"], description: "Дайте что-то только в обмен", descriptionLines: ["Дайте что-то только в", "обмен"], limit: 3 },
  { id: "package", key: 5, title: "Пакет", description: "Предложить все пять условий сразу", descriptionLines: ["Предложить все пять", "условий сразу"], limit: 3 },
  { id: "summary", key: 6, title: "Резюме", description: "Зафиксировать договорённость", descriptionLines: ["Зафиксировать", "договорённость"], limit: 1 },
];

export const cardById = (id: CardId) => cards.find((card) => card.id === id)!;

export interface QuestionDef { id: string; label: string; line: string }

export const questions: QuestionDef[] = [
  { id: "volume", label: "Что для вас важнее в объёме заказа?", line: "Что для вас важнее в объёме заказа: сколько штук вам выгодно отгрузить?" },
  { id: "payment", label: "Насколько важен график оплаты?", line: "Насколько для вас важен график оплаты: что нужно получить до поставки?" },
  { id: "term", label: "Что ограничивает срок поставки?", line: "Что ограничивает срок поставки: от чего зависит, успеете ли вы быстрее?" },
  { id: "warranty", label: "Что влияет на гарантию?", line: "Что влияет на гарантию: при каких условиях вы готовы дать 24 месяца?" },
];

export interface CriterionDef { id: string; label: string; line: string }

export const criteria: CriterionDef[] = [
  { id: "budget", label: "Бюджет: не больше 5 500 000 ₽", line: "Наш бюджет на закупку — 5 500 000 ₽. Всё, что выше, я не смогу согласовать." },
  { id: "deadline", label: "Срок: офис открывается через три недели", line: "Офис открывается через три недели — мониторы нужны заранее, чтобы успеть установить рабочие места." },
  { id: "alternative", label: "Альтернатива: предложение другого поставщика", line: "У нас есть предложение другого поставщика: 46 000 ₽ за 100 штук, 21 день, оплата 50/50, гарантия 24 месяца." },
];

export const difficultyLabels: Record<Difficulty, string> = { basic: "Базовая", medium: "Средняя", high: "Высокая" };
export const difficultyLower: Record<Difficulty, string> = { basic: "базовая", medium: "средняя", high: "высокая" };
export const difficultyHints: Record<Difficulty, string> = {
  basic: "Базовая: 2–3 параметра, одно ключевое возражение, мягкий лимит времени.",
  medium: "Средняя: все пять параметров связаны, поставщик требует обоснований, лимит времени умеренный.",
  high: "Высокая: меньше ходов и жетонов, поставщик держит позицию и проверяет расчёты.",
};

export const difficultyRules: Record<Difficulty, { maxTurns: number; tokens: number; minutes: string }> = {
  basic: { maxTurns: 8, tokens: 3, minutes: "7–10 минут" },
  medium: { maxTurns: 8, tokens: 3, minutes: "8–10 минут" },
  high: { maxTurns: 7, tokens: 2, minutes: "8–12 минут" },
};

export const methods: { id: MethodId; label: string; stages: string[]; hint: string }[] = [
  { id: "spin", label: "SPIN", stages: ["Проблема и извлечение", "Ситуация и выгода"], hint: "Этапы SPIN: ситуация · проблема · извлечение · выгода. На столе — вопросы до предложения." },
  { id: "harvard", label: "Гарвардский", stages: ["Варианты, критерии и пакет", "Интересы вместо позиций"], hint: "Этапы Гарвардского подхода: люди отдельно от проблемы · интересы · варианты · объективные критерии и пакет." },
  { id: "batna", label: "BATNA", stages: ["Сравнение с запасным вариантом", "Красные линии и уход"], hint: "BATNA: сравнивайте каждый пакет с запасным вариантом и не переходите красные линии." },
];

export const skills = ["Управление уступками", "Пакетные предложения", "Работа с интересами"];
export const topics = [scenario.topic];
export const roles = [scenario.role];

export const formats = [
  { id: "ai" as const, title: "Переговоры с AI", text: "Свободный диалог с AI-контрагентом голосом или текстом, без подсказок", meta: "10–15 минут" },
  { id: "table" as const, title: "Стол переговоров", text: "Пошаговая мини-игра: условия, карты действий и жетоны уступок", meta: "до 8 ходов · 7–10 минут" },
  { id: "choice" as const, title: "Выбор ответа", text: "Ситуации с вариантами действия или реплики — карты A, B, C", meta: "4–6 ситуаций · 5 минут" },
];

export const formatLabels: Record<string, string> = { ai: "Переговоры с AI", table: "Стол переговоров", choice: "Выбор ответа" };

export function defaultSettings(): TrainingSettings {
  return {
    format: "table",
    method: "harvard",
    stage: "Варианты, критерии и пакет",
    skill: "Управление уступками",
    topic: scenario.topic,
    role: scenario.role,
    difficulty: "basic",
  };
}

// ---------- participant-side rules ----------

export function optionOf(id: ConditionId, index: number) {
  return conditions[id].options[index];
}

export function sumOf(pkg: Package) {
  return optionOf("price", pkg.price).value * optionOf("qty", pkg.qty).value;
}

export function formatMoney(value: number) {
  return value.toLocaleString("ru-RU").replace(/ | /g, " ");
}

/** Red lines of the participant: budget and the minimum warranty. */
export function redLineIssues(pkg: Package) {
  const issues: string[] = [];
  if (sumOf(pkg) > BUDGET) issues.push(`общая сумма выше ${formatMoney(BUDGET)} ₽`);
  const warranty = conditions.warranty;
  if (warranty.redLine !== undefined && pkg.warranty > warranty.redLine) issues.push("гарантия меньше 24 месяцев");
  return issues;
}

/** A concession token is spent for every step the participant worsens their own position. */
export function tokenCost(position: Package, next: Partial<Package>) {
  let cost = 0;
  for (const id of CONDITION_IDS) {
    const value = next[id];
    if (value !== undefined && value > position[id]) cost += value - position[id];
  }
  return cost;
}

export function worsened(position: Package, next: Partial<Package>) {
  return CONDITION_IDS.filter((id) => next[id] !== undefined && next[id]! > position[id]);
}

export function packageLine(pkg: Package) {
  return [
    `${optionOf("price", pkg.price).short} ₽`,
    optionOf("qty", pkg.qty).short,
    optionOf("term", pkg.term).short,
    optionOf("payment", pkg.payment).short,
    optionOf("warranty", pkg.warranty).short,
  ].join(" · ");
}

export function samePackage(a: Package, b: Package) {
  return CONDITION_IDS.every((id) => a[id] === b[id]);
}

export function subtitleOf(settings: TrainingSettings, maxTurns: number) {
  return `Тренировка · Стол переговоров · ${difficultyLower[settings.difficulty]} · ${maxTurns} ходов`;
}
