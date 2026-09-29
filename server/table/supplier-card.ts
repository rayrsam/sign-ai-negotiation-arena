// Hidden card of the AI supplier «Андрей». It is frozen for the scenario and never sent to the client.
import { CONDITION_IDS } from "../../shared/table/scenario";
import type { ConditionId, Difficulty, Package } from "../../shared/table/types";

export interface MotiveDef {
  id: "volume" | "payment" | "production";
  title: string;
  short: string;
  text: string;
  /** Supplier's line when the participant asks the related question. */
  answer: string;
  journal: string;
}

export const motives: MotiveDef[] = [
  {
    id: "volume",
    title: "Объём заказа",
    short: "Объём",
    text: "Поставщик готов снизить цену при заказе от 120 штук.",
    answer: "Цена зависит от количества. При заказе от 120 штук мы можем говорить о другой цене.",
    journal: "Цена зависит от количества — от 120 штук можем говорить иначе",
  },
  {
    id: "payment",
    title: "График оплаты",
    short: "График",
    text: "Поставщику важно получить часть оплаты до поставки.",
    answer: "Нам нужна часть оплаты до поставки — под неё мы закупаем партию. Полная отсрочка для нас невозможна.",
    journal: "Нужна часть оплаты до поставки",
  },
  {
    id: "production",
    title: "Срок производства",
    short: "Срок",
    text: "Поставка за 7 дней требует дорогой перестройки графика.",
    answer: "Семь дней — только при полной предоплате или по 48 000 ₽. Обычный срок производства — две недели.",
    journal: "7 дней — только при полной предоплате",
  },
];

/** Which question opens which motive («warranty» only gives a fact). */
export const questionMotive: Record<string, MotiveDef["id"] | null> = {
  volume: "volume",
  payment: "payment",
  term: "production",
  warranty: null,
};

export const warrantyFact = {
  title: "Гарантия",
  text: "24 месяца — при заказе от 120 штук или по цене от 46 000 ₽.",
  answer: "Гарантию 24 месяца даём при заказе от 120 штук или по цене от 46 000 ₽. 36 месяцев — только по полной цене.",
  journal: "24 мес. — от 120 штук или от 46 000 ₽",
};

export interface Objection {
  id: string;
  motive: MotiveDef["id"] | null;
  text: string;
  fields: ConditionId[];
}

/** Why the supplier cannot accept a package (empty list — the package is acceptable). */
export function objections(pkg: Package, difficulty: Difficulty): Objection[] {
  const list: Objection[] = [];
  // price index: 0 = 44 000, 1 = 46 000, 2 = 48 000; qty index: 0 = 100, 1 = 120, 2 = 150
  if (pkg.price === 0 && pkg.qty === 0) {
    list.push({ id: "price_volume", motive: "volume", text: "44 000 ₽ возможны только при заказе от 120 штук", fields: ["price", "qty"] });
  }
  if (difficulty === "high" && pkg.price === 0 && pkg.qty === 1 && pkg.payment !== 2 && pkg.term === 0) {
    list.push({ id: "price_margin", motive: "volume", text: "по 44 000 ₽ мы не потянем ускоренную поставку", fields: ["price", "term"] });
  }
  if (pkg.payment === 0) {
    list.push({ id: "payment_prepay", motive: "payment", text: "полная отсрочка невозможна: нужна часть оплаты до поставки", fields: ["payment"] });
  }
  if (pkg.term === 0 && pkg.payment !== 2 && pkg.price !== 2) {
    list.push({ id: "term_production", motive: "production", text: "7 дней — только при полной предоплате или по 48 000 ₽", fields: ["term"] });
  }
  if (pkg.warranty === 0 && pkg.price !== 2) {
    list.push({ id: "warranty_36", motive: null, text: "36 месяцев гарантии — только по полной цене", fields: ["warranty"] });
  }
  // 24 months need an order from 120 pcs or a price from 46 000 ₽: the only package that breaks it
  // (44 000 ₽ for 100 pcs) is already refused by «price_volume».
  if (difficulty !== "basic" && pkg.warranty === 1 && pkg.term === 0 && pkg.price !== 2) {
    list.push({ id: "warranty_rush", motive: "production", text: "ускоренная поставка и 24 месяца гарантии вместе — только по полной цене", fields: ["warranty", "term"] });
  }
  return list;
}

export function acceptable(pkg: Package, difficulty: Difficulty) {
  return objections(pkg, difficulty).length === 0;
}

/** Supplier preference: higher is better for the supplier (price weighs most). */
function supplierUtility(pkg: Package) {
  return pkg.price * 5 + pkg.payment * 3 + pkg.qty * 2 + pkg.term * 1.5 + pkg.warranty;
}

const ALL_PACKAGES: Package[] = (() => {
  const list: Package[] = [];
  for (let price = 0; price < 3; price += 1)
    for (let qty = 0; qty < 3; qty += 1)
      for (let term = 0; term < 3; term += 1)
        for (let payment = 0; payment < 3; payment += 1)
          for (let warranty = 0; warranty < 3; warranty += 1) list.push({ price, qty, term, payment, warranty });
  return list;
})();

/** Every package the supplier accepts (hidden rules; used for the report). */
export function acceptablePackages(difficulty: Difficulty) {
  return ALL_PACKAGES.filter((pkg) => acceptable(pkg, difficulty));
}

/**
 * The closest acceptable package the supplier can offer back: fields in `fixed` stay as proposed,
 * the rest move as little as possible (ties go to the supplier's own preference).
 */
export function repair(proposal: Package, fixed: ConditionId[], difficulty: Difficulty, limit?: (pkg: Package) => boolean): Package | null {
  let best: Package | null = null;
  let bestScore = Infinity;
  for (const pkg of ALL_PACKAGES) {
    if (fixed.some((id) => pkg[id] !== proposal[id])) continue;
    if (!acceptable(pkg, difficulty)) continue;
    if (limit && !limit(pkg)) continue;
    const distance = CONDITION_IDS.reduce((total, id) => total + Math.abs(pkg[id] - proposal[id]), 0);
    const score = distance * 10 - supplierUtility(pkg) * 0.1;
    if (score < bestScore) {
      bestScore = score;
      best = pkg;
    }
  }
  return best;
}
