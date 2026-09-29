import { useEffect, useLayoutEffect, useState } from "react";
import { BUDGET, CONDITION_IDS, cards, conditions, formatMoney, optionOf, redLineIssues, scenario, subtitleOf, sumOf } from "../../../shared/table/scenario";
import type { CardId, ConditionId, Package, TableState } from "../../../shared/table/types";
import { Stage } from "@/table/components/stage";
import { TableHeader } from "@/table/components/layout";
import { HandText } from "@/table/components/hand-text";
import { CardIcon } from "@/table/components/card-icon";
import { CheckCircleIcon, LockIcon, TokenIcon, TriangleIcon } from "@/table/components/icons";
import { OutlineButton, TrustDots } from "@/table/components/controls";
import { CardDialog } from "@/table/components/card-dialogs";
import { TableOverlay } from "@/table/components/table-overlays";
import { clock, useTable } from "@/table/hooks/use-table";
import { Redirect, currentParams, navigate } from "@/table/lib/router";
import { cn } from "@/lib/utils";
import { loadTable } from "@/table/services/api";

/** Loads the table by id (the server keeps it) and renders the board. */
export function TableScreen() {
  const id = currentParams().get("id");
  const [state, setState] = useState<TableState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    loadTable(id, controller.signal)
      .then(setState)
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Тренировка не найдена"); });
    return () => controller.abort();
  }, [id]);

  if (!id) return <Redirect to="settings" />;
  if (!state) {
    return (
      <Stage label="Стол переговоров">
        <p className="center-note">{error ?? "Раскладываем стол…"}</p>
      </Stage>
    );
  }
  if (state.status === "aborted") return <Redirect to="settings" />;
  return <TableBoard key={state.id} initial={state} />;
}

function motiveSlots(state: TableState) {
  const revealed = state.motives.filter((motive) => motive.revealed).sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0));
  return [0, 1, 2].map((index) => revealed[index] ?? null);
}

type ChipState = "plain" | "supplier" | "you" | "redline" | "agreed";

function chipState(state: TableState, id: ConditionId, pkg: Package, owner: "supplier" | "you"): ChipState {
  const redLine = conditions[id].redLine;
  if (state.agreed.includes(id) && owner === "supplier") return "agreed";
  if (redLine !== undefined && pkg[id] > redLine) return "redline";
  if (owner === "you") return "you";
  return state.changed.includes(id) ? "supplier" : "plain";
}

export function Chip({ id, index, kind, left, top }: { id: ConditionId; index: number; kind: ChipState; left: number; top: number }) {
  const option = optionOf(id, index);
  const tag = kind === "agreed" ? "согласовано" : kind === "redline" ? "красная линия" : kind === "you" ? "вы" : "поставщик";
  return (
    <div className={cn("tb-chip", `is-${kind}`)} style={{ left, top }}>
      <div className="tb-chip-disc">
        <svg className="tb-chip-ring" width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
          <circle cx="70" cy="70" r="67" />
        </svg>
        <span className="tb-chip-head">{conditions[id].head}</span>
        <strong className="tb-chip-value">{option.chip}</strong>
        <span className="tb-chip-unit">{option.unit}</span>
      </div>
      <span className="tb-chip-tag">
        {kind === "agreed" ? <LockIcon /> : kind === "redline" ? <TriangleIcon /> : <i />}
        {tag}
      </span>
      <span className="tb-chip-goal">{conditions[id].goalLabel}</span>
    </div>
  );
}

function SumLine({ pkg, className }: { pkg: Package; className?: string }) {
  const sum = sumOf(pkg);
  const over = sum > BUDGET;
  return (
    <div className={cn("tb-sum", className)}>
      <span className="tb-sum-label">Сумма пакета</span>
      <span className="tb-sum-value" aria-label={`${formatMoney(sum)} ₽`}>
        <HandText text={formatMoney(sum)} size={31.4} color="#F2E5CD" gap={8.3} />
        <small>₽</small>
      </span>
      <span className={cn("tb-sum-status", over && "is-over")}>
        {over ? <TriangleIcon size={24} /> : <CheckCircleIcon size={24} />}
        <span>{over ? "выше бюджета" : "в бюджете"}<br />{over ? "" : "до "}{formatMoney(BUDGET)} ₽</span>
      </span>
    </div>
  );
}

function TableBoard({ initial }: { initial: TableState }) {
  const table = useTable(initial);
  const { state, selected, pending } = table;
  const finished = state.status !== "active";
  const turn = finished ? state.moves.at(-1)?.turn ?? 1 : Math.min(state.turn, state.maxTurns);
  const slots = motiveSlots(state);
  const opened = slots.filter(Boolean).length;
  const cost = table.cost;
  const blocked = table.blockedReason();
  const paused = table.overlay === "pause";

  // Keys 1–6 pick a card, Enter makes the move, Esc closes the card.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (table.overlay || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const card = cards.find((item) => String(item.key) === event.key);
      if (card) {
        if (table.canPlay(card.id)) table.select(card.id);
        return;
      }
      if (event.key === "Escape") table.select(null);
      if (event.key === "Enter" && selected) table.makeMove();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const journal = pending ? [...state.journal, { turn: state.turn, who: "you" as const, text: pending.journal }] : state.journal;
  const pendingTokens = pending ? 0 : cost;

  let hint = "Выберите карту — клавиши 1–6";
  if (finished) hint = state.status === "deal" ? "Соглашение достигнуто" : "Ходы закончились";
  else if (pending) hint = "Карты заблокированы до ответа";
  else if (selected) {
    if (blocked) hint = blocked;
    else if (selected === "question") hint = "Вопрос · жетоны не тратятся";
    else if (selected === "summary") hint = "Резюме собрано системой";
    else if (cost === 0) hint = `${table.cardTitle} · жетоны не тратятся`;
    else if (cost >= state.tokensLeft) hint = cost === 1 ? "Потратится последний жетон" : `Потратятся последние жетоны: ${cost}`;
    else hint = cost === 1 ? "Потратится 1 жетон уступки" : `Потратится ${cost} жетона уступки`;
  }

  const tokenStates = Array.from({ length: state.tokensTotal }, (_, index) => {
    if (index >= state.tokensLeft) return "spent" as const;
    if (index >= state.tokensLeft - pendingTokens) return "pending" as const;
    return "full" as const;
  });

  const tableOwner: "supplier" | "you" = "supplier";
  const onTable = state.supplierOffer;
  const tableTitle = state.dealReady ? "на столе · пакет принят" : "на столе · предложение поставщика";

  function goResult() {
    navigate("result", { id: state.id });
  }

  return (
    <Stage label="Стол переговоров" className={cn("tb-stage", paused && "is-paused")}>
      <TableHeader title={scenario.title} subtitle={subtitleOf(state.settings, state.maxTurns)}>
        <div className="tb-turn" aria-label={`Ход ${turn} из ${state.maxTurns}`}>
          <span>Ход</span>
          <HandText text={String(turn)} size={46} color="#FF6547" className="tb-turn-number" />
          <span className="tb-turn-of">из {state.maxTurns}</span>
        </div>
        <div className={cn("tb-timer", (paused || finished) && "is-paused")} aria-label={`Время ${clock(table.elapsed)}`}>
          {paused ? <b className="tb-timer-pause" aria-hidden="true"><i /><i /></b> : <i className="tb-timer-dot" />}
          {clock(table.elapsed)}
        </div>
        <OutlineButton box={{ left: 1499.3, top: 42, width: 127, height: 60 }} pressed={paused} onClick={() => table.setOverlay("pause")} disabled={finished}>Пауза</OutlineButton>
        <OutlineButton box={{ left: 1641.8, top: 42, width: 162.3, height: 60 }} onClick={() => (finished ? navigate("settings") : table.setOverlay("exit"))}>Выйти</OutlineButton>
      </TableHeader>

      {/* ---------- left column ---------- */}
      <section className="tb-side" aria-label="Состояние сессии">
        <h2 className="tb-side-title" style={{ top: 214 }}>Доверие</h2>
        <TrustDots value={state.trust} style={{ left: 125.5, top: 261.8 }} />
        {state.lastDelta && state.lastDelta.trust !== 0 && !pending && (
          <p className="tb-delta" style={{ top: 290 }}>
            <b>{state.lastDelta.trust > 0 ? "+" : "−"}{Math.abs(state.lastDelta.trust)}</b>
            <span>{state.lastDelta.reason}</span>
          </p>
        )}

        <h2 className="tb-side-title" style={{ top: 500 }}>Жетоны уступок</h2>
        <div className="tb-tokens">
          {tokenStates.map((token, index) => (
            <span key={index} className={cn("tb-token", `is-${token}`)} style={{ left: 127.5 + 78 * index }}>
              <TokenIcon state={token} />
            </span>
          ))}
        </div>
        <p className="tb-left">Осталось</p>
        <HandText className="tb-left-number" text={String(state.tokensLeft)} size={29} color="#F2E5CD" />
        {pendingTokens > 0 && <p className="tb-writeoff"><i />к списанию: {pendingTokens}</p>}

        <h2 className="tb-side-title" style={{ top: 814 }}>Игровые очки</h2>
        <div className="tb-points" aria-label={`${state.points} игровых очков`}>
          <HandText text={String(state.points)} size={55} color="#CDDFF8" gap={6} />
          {state.lastDelta && state.lastDelta.points > 0 && !pending && <b>+{state.lastDelta.points}</b>}
        </div>

        <button type="button" className="tb-howto" onClick={() => navigate("howto", { id: state.id })}>
          <img src="/assets/info.svg" alt="" width="26" height="26" />
          Как устроен стол
        </button>
      </section>

      {/* ---------- supplier ---------- */}
      <img className="asset tb-avatar" src="/assets/avatar.svg" alt="" width="160" height="136" draggable={false} />
      <article className={cn("tb-bubble", pending && "is-waiting")} aria-live="polite">
        <header>
          <strong>{scenario.supplierName} · {scenario.supplierRole}</strong>
          <span>{pending ? `Ход ${state.turn} · ответ` : state.reply.label}</span>
        </header>
        {pending ? (
          <>
            <p className="tb-bubble-wait">Поставщик оценивает предложение <i /><i /><i /></p>
            <small>Повторная отправка заблокирована — ход уже принят</small>
          </>
        ) : (
          <p key={state.reply.turn + state.reply.text}>{state.reply.text}</p>
        )}
      </article>

      <div className="tb-motives" aria-label="Мотивы поставщика">
        {slots.map((motive, index) => (
          <div key={index} className={cn("tb-motive", motive && "is-open")} style={{ left: 1131 + 120 * index }} title={motive?.text}>
            {motive ? <span>{motive.title.split(" ").map((word) => <span key={word}>{word}</span>)}</span> : <img src="/assets/motive-q.svg" alt="Мотив скрыт" width="46" height="46" />}
          </div>
        ))}
        <p>Мотивы поставщика · открыто {opened} из 3</p>
      </div>

      {/* ---------- the table ---------- */}
      {(!selected || pending || table.overlay === "connection") && (
        <section className="tb-table" aria-label="Стол">
          <div className="tb-table-inner" />
          <h2>{tableTitle}</h2>
          {CONDITION_IDS.map((id, index) => (
            <Chip key={id} id={id} index={onTable[id]} kind={chipState(state, id, onTable, tableOwner)} left={109.3 + 179.35 * index} top={74} />
          ))}
          <SumLine pkg={onTable} />
        </section>
      )}

      {selected && !pending && table.overlay !== "connection" && <CardDialog table={table} />}

      {/* ---------- hand of cards ---------- */}
      <div className={cn("tb-hand", (pending || finished) && "is-locked")}>
        {cards.map((card, index) => {
          const left = state.cardsLeft[card.id];
          const disabled = !table.canPlay(card.id);
          const isSelected = selected === card.id && !pending;
          const dimmed = left <= 0 || (card.id === "concession" && state.tokensLeft <= 0 && !isSelected);
          return (
            <button
              key={card.id}
              type="button"
              className={cn("tb-card", isSelected && "is-selected", dimmed && "is-dim")}
              style={{ left: 404 + 181.66 * index }}
              onClick={() => table.select(card.id)}
              disabled={disabled && !isSelected}
              aria-pressed={isSelected}
              aria-keyshortcuts={String(card.key)}
              title={card.id === "summary" && !state.dealReady ? "Резюме — после принятого пакета" : card.description}
            >
              <HandText className="tb-card-key" text={String(card.key)} size={34} color="#FF6547" />
              <CardIcon card={card.id} inverted={isSelected} className="tb-card-icon" />
              <strong className={cn(card.titleLines && "is-two")}>{card.titleLines ? <>{card.titleLines[0]}<br />{card.titleLines[1]}</> : card.title}</strong>
              <small>{card.descriptionLines.map((line, lineIndex) => <span key={lineIndex}>{line}</span>)}</small>
              <i className="tb-card-rule" />
              <span className="tb-card-dots">
                {Array.from({ length: card.limit }, (_, dot) => <i key={dot} className={cn(dot < left && "is-on")} />)}
              </span>
              <em>ещё {left}</em>
            </button>
          );
        })}
      </div>

      {/* ---------- right column ---------- */}
      <section className="tb-journal" aria-label="Журнал">
        <h2>Журнал</h2>
        <JournalList entries={journal} />
      </section>

      {state.learned ? (
        <section className="tb-learned is-open" aria-live="polite" key={state.learned.title + state.learned.source}>
          <p className="tb-learned-kicker">Вы узнали</p>
          <h3>{state.learned.title}</h3>
          <p>{state.learned.text}</p>
          <small>{state.learned.source}</small>
        </section>
      ) : (
        <section className="tb-learned">
          <p>Здесь появятся факты о поставщике — после ваших вопросов и предложений</p>
        </section>
      )}

      {table.notice && (
        <div className="tb-notice" role="status">
          <span>{table.notice}</span>
          <button type="button" onClick={() => table.setNotice(null)} aria-label="Закрыть">×</button>
        </div>
      )}

      <p className="tb-hint">{hint}</p>
      {finished ? (
        <button type="button" className="tb-go is-ready" onClick={goResult}>К итогам</button>
      ) : (
        <button
          type="button"
          className={cn("tb-go", selected && !blocked && !pending && "is-ready")}
          disabled={!selected || Boolean(blocked) || Boolean(pending)}
          onClick={() => table.makeMove()}
        >
          {pending ? "Ход отправлен" : selected === "summary" ? "Подтвердить" : "Сделать ход"}
        </button>
      )}

      <TableOverlay table={table} />
    </Stage>
  );
}

function JournalList({ entries }: { entries: TableState["journal"] }) {
  const [node, setNode] = useState<HTMLOListElement | null>(null);
  // Show the latest entries that fit completely: the first visible entry is never cut in half.
  useLayoutEffect(() => {
    if (!node) return;
    const items = [...node.children] as HTMLElement[];
    const first = items.find((item) => node.scrollHeight - item.offsetTop <= node.clientHeight + 1);
    node.scrollTop = first ? first.offsetTop - (items[0]?.offsetTop ?? 0) : node.scrollHeight;
  }, [node, entries.length]);
  return (
    <ol ref={setNode}>
      {entries.map((entry, index) => (
        <li key={index} className={cn(entry.who === "supplier" ? "is-supplier" : "is-you")}>
          <b>{entry.start ? "Старт · поставщик" : `Ход ${entry.turn} · ${entry.who === "you" ? "вы" : "поставщик"}`}</b>
          <span>{entry.text}</span>
        </li>
      ))}
    </ol>
  );
}

export type { CardId };
