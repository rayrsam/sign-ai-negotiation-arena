import { useEffect, useRef, useState } from "react";
import { BUDGET, CONDITION_IDS, cardById, conditions, criteria, formatMoney, optionOf, questions, redLineIssues, scenario, sumOf, tokenCost, worsened } from "../../../shared/table/scenario";
import { concessionLine, keptConditions, keepText, moveLine } from "../../../shared/table/moves";
import type { CardId, ConditionId, Package } from "../../../shared/table/types";
import { HandText } from "@/table/components/hand-text";
import { CheckCircleIcon, TriangleIcon } from "@/table/components/icons";
import { moveOf, type useTable } from "@/table/hooks/use-table";
import { cn } from "@/lib/utils";

type Table = ReturnType<typeof useTable>;

const shortTitle: Record<ConditionId, string> = { price: "цена", qty: "объём", term: "срок", payment: "оплата", warranty: "гарантия" };

const icons: Record<CardId, string> = {
  question: "/assets/modal-question.svg",
  anchor: "/assets/modal-package.svg",
  criterion: "/assets/modal-question.svg",
  concession: "/assets/modal-exchange.svg",
  package: "/assets/modal-package.svg",
  summary: "/assets/modal-summary.svg",
};

function DialogFrame({ table, card, subtitle, children }: { table: Table; card: CardId; subtitle: string; lightClose?: boolean; children: React.ReactNode }) {
  const def = cardById(card);
  return (
    <section className="cd-dialog" role="dialog" aria-label={def.title}>
      <HandText className="cd-key" text={String(def.key)} size={40} color="#FF6547" />
      <img className="cd-icon" src={icons[card]} alt="" width="30" height="30" />
      <h2 className="cd-title">{def.title}</h2>
      <p className="cd-sub">{subtitle}</p>
      <button type="button" className="cd-close" onClick={() => table.select(null)} aria-label="Закрыть карту" title="Закрыть (Esc)">
        <img src="/assets/close-light.svg" alt="" width="52" height="52" />
      </button>
      {children}
    </section>
  );
}

function turnLine(table: Table) {
  return `Ход ${table.state.turn} из ${table.state.maxTurns}`;
}

// ---------- Вопрос / Критерий: a list of options and the participant's line ----------

function ChoiceDialog({ table, card }: { table: Table; card: "question" | "criterion" }) {
  const { state, drafts, setDrafts } = table;
  const items = card === "question" ? questions : criteria;
  const value = card === "question" ? drafts.questionId : drafts.criterionId;
  const setValue = (id: string) => setDrafts((current) => (card === "question" ? { ...current, questionId: id } : { ...current, criterionId: id }));
  const used = (id: string) => (card === "question" ? false : state.usedCriteria.includes(id));
  const subtitle = card === "question"
    ? `${turnLine(table)} · выберите тему — поставщик ответит и может раскрыть мотив`
    : `${turnLine(table)} · обоснуйте позицию бюджетом, сроком или альтернативой`;
  const line = moveLine(state, moveOf(card, drafts));
  return (
    <DialogFrame table={table} card={card} subtitle={subtitle} lightClose>
      <ul className="cd-options" role="radiogroup" aria-label={card === "question" ? "Тема вопроса" : "Критерий"}>
        {items.map((item) => {
          const on = item.id === value;
          const asked = card === "question" && state.askedQuestions.includes(item.id);
          return (
            <li key={item.id}>
              <button type="button" role="radio" aria-checked={on} className={cn("cd-option", on && "is-on")} disabled={used(item.id)} onClick={() => setValue(item.id)}>
                <i className="cd-radio" />
                <span>{item.label}</span>
                {(asked || used(item.id)) && <small>{asked ? "уже задан" : "использован"}</small>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="cd-reply">
        <p className="cd-reply-kicker">Ваша реплика</p>
        <p className="cd-reply-text">{line}</p>
      </div>
    </DialogFrame>
  );
}

// ---------- Уступка при условии ----------

function ConditionPicker({ value, exclude, onChange, label }: { value: ConditionId; exclude: ConditionId; onChange: (id: ConditionId) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="cd-picker" ref={ref}>
      <button type="button" className="cd-picker-button" onClick={() => setOpen(!open)} aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${conditions[value].title}`}>
        {conditions[value].title}
        <svg width="12" height="8" viewBox="-1 -1 12 8" aria-hidden="true"><path d="M0 0L5 5L10 0" stroke="#8B8484" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <ul className="cd-picker-menu" role="listbox">
          {CONDITION_IDS.filter((id) => id !== exclude).map((id) => (
            <li key={id}>
              <button type="button" role="option" aria-selected={id === value} className={cn(id === value && "is-on")} onClick={() => { onChange(id); setOpen(false); }}>
                {conditions[id].title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StepPills({ id, value, current, onChange, disabledAbove }: { id: ConditionId; value: number; current: number; onChange: (index: number) => void; disabledAbove?: number }) {
  return (
    <div className="cd-steps" role="radiogroup" aria-label={conditions[id].title}>
      {conditions[id].options.map((option, index) => (
        <button
          key={option.pill}
          type="button"
          role="radio"
          aria-checked={index === value}
          className={cn("cd-step", index === value ? "is-on" : index === current ? "is-current" : "is-other")}
          disabled={disabledAbove !== undefined && index > disabledAbove}
          onClick={() => onChange(index)}
        >
          {option.pill}
        </button>
      ))}
    </div>
  );
}

function ConcessionDialog({ table }: { table: Table }) {
  const { state, drafts, setDrafts } = table;
  if (state.tokensLeft <= 0) {
    return (
      <DialogFrame table={table} card="concession" subtitle={`${turnLine(table)} · нужен 1 жетон, осталось 0`}>
        <div className="cd-empty">
          <span className="cd-empty-tokens" aria-hidden="true"><i /><i /><i /></span>
          <h3>Жетоны уступок закончились.</h3>
          <p>Соберите пакет из уже согласованных значений или используйте другое действие.</p>
        </div>
        <p className="cd-empty-foot">Доступно без жетонов: Вопрос · Критерий · Пакет из согласованного · Резюме</p>
      </DialogFrame>
    );
  }
  const draft = drafts.concession;
  const update = (patch: Partial<typeof draft>) => setDrafts((current) => ({ ...current, concession: { ...current.concession, ...patch } }));
  const cost = tokenCost(state.position, { [draft.give]: draft.giveIndex });
  const keeps = keptConditions(state, draft.give, draft.ask);
  const from = state.position[draft.give];
  const giveNote = draft.giveIndex > from
    ? `${optionOf(draft.give, from).short} → ${optionOf(draft.give, draft.giveIndex).short} · ухудшает вашу позицию ${draft.giveIndex - from === 1 ? "на шаг" : `на ${draft.giveIndex - from} шага`}`
    : `${optionOf(draft.give, draft.giveIndex).short} · не ухудшает вашу позицию`;
  const after: Package = { ...state.position, [draft.give]: draft.giveIndex, [draft.ask]: draft.askIndex };
  return (
    <DialogFrame table={table} card="concession" subtitle={`${turnLine(table)} · дайте что-то только в обмен — обе части обязательны`}>
      <div className="cd-exchange">
        <div className="cd-side" style={{ left: 36 }}>
          <p className="cd-kicker">Мы готовы...</p>
          <ConditionPicker label="Что отдаёте" value={draft.give} exclude={draft.ask} onChange={(id) => update({ give: id, giveIndex: Math.min(state.position[id] + 1, 2) })} />
          <StepPills id={draft.give} value={draft.giveIndex} current={from} onChange={(index) => update({ giveIndex: index })} />
          <p className="cd-note">{giveNote}</p>
        </div>
        <svg className="cd-arrow" width="53" height="27" viewBox="-1.5 -1.5 53 27" aria-hidden="true">
          <path d="M0 12H50M38 0L50 12L38 24" stroke="#FF6547" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        <div className="cd-side" style={{ left: 556 }}>
          <p className="cd-kicker">...если вы</p>
          <ConditionPicker label="Что просите" value={draft.ask} exclude={draft.give} onChange={(id) => update({ ask: id, askIndex: state.position[id] })} />
          <StepPills id={draft.ask} value={draft.askIndex} current={state.supplierOffer[draft.ask]} onChange={(index) => update({ askIndex: index })} />
          <p className="cd-note is-light">{keeps.length ? `+ ${keeps.map((id) => keepText(id, state.supplierOffer[id])).join(" и ")}` : `сейчас у поставщика: ${optionOf(draft.ask, state.supplierOffer[draft.ask]).short}`}</p>
        </div>
      </div>
      <p className="cd-line">{concessionLine(state, draft.give, draft.giveIndex, draft.ask, draft.askIndex)}</p>
      <div className="cd-foot">
        <span className={cn("cd-foot-token", cost === 0 && "is-free")}><i />{cost === 0 ? "Жетоны не тратятся" : cost === 1 ? "Потратится 1 жетон уступки" : `Потратится ${cost} жетона уступки`}</span>
        <span className="cd-foot-sum-label">Сумма</span>
        <span className="cd-foot-sum">{formatMoney(sumOf(state.position))} → {formatMoney(sumOf(after))} ₽</span>
      </div>
    </DialogFrame>
  );
}

// ---------- Пакет / Якорь ----------

function PackageDialog({ table, card }: { table: Table; card: "package" | "anchor" }) {
  const { state, drafts, setDrafts } = table;
  const pkg = card === "package" ? drafts.pkg : drafts.anchor;
  const setPkg = (next: Package) => setDrafts((current) => (card === "package" ? { ...current, pkg: next } : { ...current, anchor: next }));
  const cost = card === "package" ? tokenCost(state.position, pkg) : 0;
  const issues = redLineIssues(pkg);
  const changed = card === "package" ? worsened(state.position, pkg) : [];
  const subtitle = card === "package"
    ? `${turnLine(table)} · выберите значения всех пяти условий — сумма считается сама`
    : `${turnLine(table)} · назовите свой пакет первым — жетоны не тратятся`;
  const tokenText = cost === 0
    ? "жетоны не тратятся"
    : changed.length === 1
      ? `потратится ${cost === 1 ? "1 жетон" : `${cost} жетона`}: ${shortTitle[changed[0]]} → ${optionOf(changed[0], pkg[changed[0]]).short}`
      : `потратится ${cost} жетона: ${changed.map((id) => shortTitle[id]).join(", ")}`;
  return (
    <DialogFrame table={table} card={card} subtitle={subtitle}>
      <div className="cd-rows">
        {CONDITION_IDS.map((id, row) => (
          <div key={id} className="cd-row" style={{ top: 128 + 44 * row }}>
            <span className="cd-row-label">{conditions[id].title}</span>
            <div className="cd-row-pills" role="radiogroup" aria-label={conditions[id].title}>
              {conditions[id].options.map((option, index) => (
                <button key={option.pill} type="button" role="radio" aria-checked={pkg[id] === index} className={cn("cd-pill", pkg[id] === index && "is-on")} onClick={() => setPkg({ ...pkg, [id]: index })}>
                  {option.pill}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="cd-summary">
        <p className="cd-summary-label">Сумма пакета</p>
        <HandText className="cd-summary-sum" text={formatMoney(sumOf(pkg))} size={30.4} color="#CDDFF8" gap={8.3} label={`${formatMoney(sumOf(pkg))} ₽`} />
        <p className="cd-summary-calc">{optionOf("price", pkg.price).pill} × {optionOf("qty", pkg.qty).pill} — расчёт на сервере</p>
        <p className={cn("cd-summary-check", issues.length && "is-bad")}>
          {issues.length ? <TriangleIcon size={24} /> : <CheckCircleIcon size={24} />}
          {issues.length ? `за красной линией: ${issues.join(", ")}` : "красные линии соблюдены"}
        </p>
        <p className={cn("cd-summary-token", cost === 0 && "is-free")}><i />{tokenText}</p>
      </div>
      {cost > state.tokensLeft && <p className="cd-warning">Не хватает жетонов: нужно {cost}, осталось {state.tokensLeft}. Верните часть условий к своей позиции.</p>}
    </DialogFrame>
  );
}

// ---------- Резюме ----------

function SummaryDialog({ table }: { table: Table }) {
  const { state } = table;
  const pkg = state.acceptedPackage;
  if (!pkg) {
    return (
      <DialogFrame table={table} card="summary" subtitle={`${turnLine(table)} · резюме фиксирует принятый пакет`}>
        <div className="cd-empty is-soft">
          <h3>Пакета для резюме пока нет.</h3>
          <p>Сначала поставщик должен принять пакет — предложите его картой «Пакет» или «Якорь».</p>
        </div>
      </DialogFrame>
    );
  }
  const allIn = sumOf(pkg) <= BUDGET && redLineIssues(pkg).length === 0;
  return (
    <DialogFrame table={table} card="summary" subtitle={`${turnLine(table)} · проверьте договорённость и подтвердите`}>
      <p className="cd-resume">{moveLine(state, { card: "summary" })}</p>
      <p className="cd-resume-check">
        <CheckCircleIcon size={24} />
        {allIn ? "Все пять условий в пакете · красные линии соблюдены · сумма в бюджете" : "Все пять условий в пакете · есть нарушение красной линии"}
      </p>
      <p className="cd-resume-note">Текст собран системой и не редактируется</p>
    </DialogFrame>
  );
}

export function CardDialog({ table }: { table: Table }) {
  switch (table.selected) {
    case "question": return <ChoiceDialog table={table} card="question" />;
    case "criterion": return <ChoiceDialog table={table} card="criterion" />;
    case "concession": return <ConcessionDialog table={table} />;
    case "package": return <PackageDialog table={table} card="package" />;
    case "anchor": return <PackageDialog table={table} card="anchor" />;
    case "summary": return <SummaryDialog table={table} />;
    default: return null;
  }
}

export { scenario };
