import { BUDGET, cardById, conditions, criteria, difficultyLabels, formatMoney, methods, optionOf, questions, scenario, sumOf } from "../../../shared/table/scenario";
import type { MoveRecord, Package, TableState } from "../../../shared/table/types";
import { Stage } from "@/table/components/stage";
import { AppLayout } from "@/table/components/layout";
import { HandText } from "@/table/components/hand-text";
import { CheckCircleIcon, TriangleIcon } from "@/table/components/icons";
import { useReport } from "@/table/hooks/use-report";
import { finalPackage } from "@/table/lib/report-view";
import { Redirect, currentParams } from "@/table/lib/router";
import { cn } from "@/lib/utils";

const HEIGHT = 2620;

function paymentLong(index: number) {
  return index === 1 ? "50% аванс, 50% после" : index === 2 ? "100% предоплата" : "через 30 дней после поставки";
}

type Marker = "start" | "light" | "accent" | "diamond" | "ring" | "check";

interface TimelineItem { marker: Marker; kicker: string; title: string; caption: string }

function timelineOf(state: TableState): TimelineItem[] {
  const start = scenario.startOffer;
  const items: TimelineItem[] = [{
    marker: "start",
    kicker: "Старт",
    title: "Предложение",
    caption: `${optionOf("price", start.price).short} · ${optionOf("qty", start.qty).value} · ${optionOf("term", start.term).short}`,
  }];
  for (const move of state.moves) items.push(timelineItem(state, move));
  return items;
}

function timelineItem(state: TableState, move: MoveRecord): TimelineItem {
  const kicker = `Ход ${move.turn}`;
  switch (move.card) {
    case "question": {
      const motive = state.motives.find((item) => item.turn === move.turn && item.revealed);
      return motive
        ? { marker: "accent", kicker, title: "Вы узнали", caption: motive.title.toLowerCase() }
        : { marker: "light", kicker, title: "Вопрос", caption: move.change };
    }
    case "criterion": return { marker: "light", kicker, title: "Критерий", caption: move.change.split(":")[0] };
    case "anchor": return { marker: "diamond", kicker, title: "Якорь", caption: move.change.split(" · ").slice(0, 3).join(" · ").replace(" шт.", "") };
    case "concession": return { marker: "ring", kicker, title: "Уступка", caption: move.change.replace(/^.*?→ /, "").replace(", если ", " — ") };
    case "package": return { marker: "diamond", kicker, title: "Пакет", caption: `${move.change.split("сумма ")[1] ?? ""} · ${move.outcome === "accepted" ? "принят" : "встречный"}` };
    case "summary": return { marker: "check", kicker, title: "Резюме", caption: "сделка" };
  }
}

function MarkerIcon({ kind }: { kind: Marker }) {
  switch (kind) {
    case "start": return <i className="fr-marker is-start" />;
    case "light": return <i className="fr-marker is-light" />;
    case "accent": return <i className="fr-marker is-accent" />;
    case "diamond": return <i className="fr-marker is-diamond" />;
    case "ring": return <i className="fr-marker is-ring" />;
    case "check": return (
      <svg className="fr-marker is-check" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#FF6547" />
        <path d="M7 12.2L10.4 15.2L16.6 8.8" stroke="#22201E" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
}

function checksOf(pkg: Package) {
  const backup = scenario.backup;
  const sum = sumOf(pkg);
  return [
    { ok: sum <= BUDGET, text: `Сумма ${formatMoney(sum)} ${sum <= BUDGET ? "≤" : ">"} ${formatMoney(BUDGET)} ₽` },
    { ok: pkg.price <= backup.price, text: `Цена ${optionOf("price", pkg.price).short} ${pkg.price <= backup.price ? "≤" : ">"} ${optionOf("price", backup.price).short} ₽` },
    { ok: optionOf("qty", pkg.qty).value <= 120, text: `${optionOf("qty", pkg.qty).pill} ${optionOf("qty", pkg.qty).value <= 120 ? "≤" : ">"} 120 шт.` },
    { ok: pkg.term <= 1, text: `${optionOf("term", pkg.term).short} ${pkg.term <= 1 ? "≤" : ">"} 14 дней` },
    { ok: pkg.payment < 2, text: pkg.payment === 2 ? "Аванс 100% — полная предоплата" : `Аванс ${pkg.payment === 1 ? "50%" : "0%"}, не 100%` },
    { ok: pkg.warranty <= 1, text: `Гарантия ${optionOf("warranty", pkg.warranty).value} ${pkg.warranty <= 1 ? "≥" : "<"} 24 мес.` },
  ];
}

function backupParagraph(state: TableState, pkg: Package) {
  const backup = scenario.backup;
  const head = `запасного варианта (${optionOf("price", backup.price).pill} · ${optionOf("term", backup.term).short} · ${formatMoney(sumOf(backup))} ₽)`;
  const pros: string[] = [];
  if (pkg.term < backup.term) pros.push(`срок на ${pkg.term === 1 ? "неделю" : "две недели"} короче`);
  if (pkg.price < backup.price) pros.push("цена за штуку ниже");
  if (pkg.warranty < backup.warranty) pros.push("гарантия дольше");
  const extra = optionOf("qty", pkg.qty).value - optionOf("qty", backup.qty).value;
  const sumNote = sumOf(pkg) > sumOf(backup) && extra > 0 ? ` Сумма выше — за счёт ${extra} мониторов в резерв.` : "";
  if (state.status !== "deal") return `Сделки нет — остаётся ${head}. Сравнивайте каждый пакет с ним до отправки.`;
  return pros.length ? `Лучше ${head}: ${pros.join(", ")}.${sumNote}` : `Не лучше ${head}.${sumNote}`;
}

function sourceShort(source?: string) {
  if (!source) return "";
  return source.replace("открыто вашим ", "ваш ").replace("открыто вашей ", "ваша ").replace("вопросом", "вопрос").replace("якорем", "якорь").replace("пакетом", "пакет").replace("критерием", "критерий").replace("уступкой", "уступка");
}

/** T19 · Полный отчёт (1920×2620, the page scrolls). */
export function FullReportScreen() {
  const id = currentParams().get("id");
  const { state, report, error, retry } = useReport(id);
  const title = "Полный отчёт";
  const breadcrumb = "Главная/Тренировка/Стол переговоров/Полный отчёт";

  if (!id) return <Redirect to="history" />;
  if (!state || !report) {
    return (
      <Stage label={title}>
        <AppLayout title={title} breadcrumb={breadcrumb} active="training">
          <section className="panel fr-pending" role="status">
            <h2>{error ? "Отчёт пока не готов" : "Готовим полный отчёт"}</h2>
            <p>{error ?? "Оценщик проверяет каждый ход: уступки, обмены и красные линии. Обычно это 10–20 секунд."}</p>
            {error ? <button type="button" onClick={retry}>Повторить</button> : <div className="fr-progress"><i /></div>}
          </section>
        </AppLayout>
      </Stage>
    );
  }
  if (state.status === "active") return <Redirect to="table" params={{ id: state.id }} />;

  const pkg = finalPackage(state);
  const deal = state.status === "deal";
  const method = methods.find((item) => item.id === state.settings.method);
  const timeline = timelineOf(state);
  const span = 1418;
  const step = timeline.length > 1 ? span / (timeline.length - 1) : 0;
  const alt = report.alternative;
  const opened = state.motives.filter((motive) => motive.revealed).sort((a, b) => (a.turn ?? 0) - (b.turn ?? 0));
  const concessions = [...state.concessions].sort((a, b) => a.turn - b.turn);

  return (
    <Stage label={title} height={HEIGHT}>
      <AppLayout title={title} breadcrumb={breadcrumb} active="training">
        {/* ---------- top: settings, final package, backup ---------- */}
        <section className="panel fr-settings">
          <h2 className="fr-kicker">Настройки и цель</h2>
          <dl>
            <dt>Навык</dt><dd>{state.settings.skill}</dd>
            <dt>Методика</dt><dd>{method?.label ?? ""} · {state.settings.stage.toLowerCase()}</dd>
            <dt>Тематика</dt><dd>{state.settings.topic}</dd>
            <dt>Роль</dt><dd>{state.settings.role.split(" · ").at(-1)!.replace(/^./, (char) => char.toUpperCase())}</dd>
            <dt>Сложность</dt><dd>{difficultyLabels[state.settings.difficulty]} · {state.maxTurns} ходов</dd>
          </dl>
          <p className="fr-goal">Цель: 44 000 ₽ · 100 шт. · 7 дней · через 30 дней · 24 мес.</p>
        </section>

        <section className="panel fr-final">
          <h2 className="fr-kicker">{deal ? "Итоговый пакет" : "Последнее предложение"}</h2>
          <span className="fr-final-sum" aria-label={`${formatMoney(sumOf(pkg))} ₽`}>
            <HandText text={formatMoney(sumOf(pkg))} size={40} color="#CDDFF8" gap={8.3} />
            <small>₽</small>
          </span>
          <p className="fr-formula">{optionOf("price", pkg.price).pill} × {optionOf("qty", pkg.qty).pill} — посчитано на сервере</p>
          <dl>
            <dt>Срок</dt><dd>{optionOf("term", pkg.term).short}</dd>
            <dt>Оплата</dt><dd>{paymentLong(pkg.payment)}</dd>
            <dt>Гарантия</dt><dd>{optionOf("warranty", pkg.warranty).value} месяца</dd>
          </dl>
        </section>

        <section className="panel fr-backup">
          <h2 className="fr-kicker">Запасной вариант и красные линии</h2>
          <ul>
            {checksOf(pkg).map((check) => (
              <li key={check.text} className={cn(!check.ok && "is-bad")}>
                {check.ok ? <CheckCircleIcon size={22} color="#CDDFF8" /> : <TriangleIcon size={20} color="#F2E5CD" />}
                {check.text}
              </li>
            ))}
          </ul>
          <p>{backupParagraph(state, pkg)}</p>
        </section>

        {/* ---------- skill scale ---------- */}
        <h2 className="fr-title" style={{ top: 532 }}>Оценка навыка</h2>
        <p className="fr-scale-note">{state.settings.skill} · 0–4 по наблюдаемым действиям</p>
        {report.anchors.map((anchor, index) => (
          <section key={index} className={cn("panel fr-anchor", index === report.score && "is-current")} style={{ left: 208 + 327.6 * index }}>
            <HandText className="fr-anchor-number" text={String(index)} size={43} color={index === report.score ? "#FF6547" : "#CDDFF8"} />
            {index === report.score && <span className="fr-anchor-tag">ваш результат</span>}
            <p>{anchor}</p>
          </section>
        ))}
        <p className="fr-missing">{report.text.missing}</p>

        {/* ---------- timeline ---------- */}
        <h2 className="fr-title" style={{ top: 872 }}>Хронология ходов</h2>
        <section className="panel fr-timeline" aria-label="Хронология ходов">
          <i className="fr-timeline-line" />
          {timeline.map((item, index) => {
            const x = 102 + step * index;
            const above = index % 2 === 0;
            return (
              <div key={index} className={cn("fr-event", above ? "is-above" : "is-below")} style={{ left: x }}>
                <MarkerIcon kind={item.marker} />
                <span className="fr-event-kicker">{item.kicker}</span>
                <strong>{item.title}</strong>
                <small>{item.caption}</small>
              </div>
            );
          })}
        </section>

        {/* ---------- moves table ---------- */}
        <h2 className="fr-title" style={{ top: 1268 }}>Карты, условия, жетоны и реакции</h2>
        <section className="panel fr-moves">
          <div className="fr-moves-head">
            <span style={{ left: 36 }}>Ход</span>
            <span style={{ left: 123 }}>Карта</span>
            <span style={{ left: 312.7 }}>Что изменилось</span>
            <span style={{ left: 792.1 }}>Жетоны</span>
            <span style={{ left: 912.2 }}>Доверие</span>
            <span style={{ left: 1043.1 }}>Реакция поставщика</span>
          </div>
          {state.moves.map((move, index) => (
            <div key={move.turn} className={cn("fr-move", index % 2 === 0 && "is-dark")} style={{ top: 66 + 46 * index }}>
              <span style={{ left: 12 }}>{move.turn}</span>
              <strong style={{ left: 99 }}>{cardById(move.card).title}</strong>
              <span style={{ left: 289 }} title={move.change}>{move.change}</span>
              <span style={{ left: 768 }}>{move.tokensBefore === move.tokensAfter ? move.tokensAfter : `${move.tokensBefore} → ${move.tokensAfter}`}</span>
              <span style={{ left: 888 }} className={cn(move.trustDelta > 0 && "is-plus", move.trustDelta < 0 && "is-minus")}>{move.trustDelta > 0 ? `+${move.trustDelta}` : move.trustDelta < 0 ? `−${-move.trustDelta}` : "0"}</span>
              <span style={{ left: 1019 }} title={move.reaction}>{move.reaction.charAt(0).toLowerCase() + move.reaction.slice(1)}</span>
            </div>
          ))}
        </section>

        {/* ---------- concessions & interests ---------- */}
        <section className="panel fr-list fr-concessions">
          <h2 className="fr-kicker">Условные и бесплатные уступки</h2>
          {concessions.length === 0 && <p className="fr-empty">Уступок не было — вы договаривались без жетонов.</p>}
          {concessions.slice(0, 3).map((item, index) => (
            <div key={index} className="fr-item" style={{ top: 84 + 76 * index }}>
              <strong>{optionOf(item.condition, item.from).short} → {optionOf(item.condition, item.to).short}</strong>
              <small>{item.exchange}</small>
              <em>{item.conditional ? "условная" : "бесплатная"}</em>
            </div>
          ))}
        </section>
        <section className="panel fr-list fr-interests">
          <h2 className="fr-kicker">Раскрытые интересы поставщика</h2>
          {opened.length === 0 && <p className="fr-empty">Мотивы поставщика остались закрытыми — начните с карты «Вопрос».</p>}
          {opened.map((motive, index) => (
            <div key={motive.id} className="fr-interest" style={{ top: 88 + 76.5 * index }}>
              <span className="fr-interest-chip">{motive.short}</span>
              <strong>{(motive.text ?? "").replace(/^Поставщик[уа]? ?/, "").replace(/\.$/, "")}</strong>
              <small>ход {motive.turn} · {sourceShort(motive.source)}</small>
            </div>
          ))}
        </section>

        {/* ---------- alternatives ---------- */}
        <section className="panel fr-alt">
          <h2 className="fr-kicker">Другой достижимый пакет</h2>
          {alt ? (
            <>
              <strong>{optionOf("price", alt.price).pill} × {optionOf("qty", alt.qty).pill} = {formatMoney(sumOf(alt))} ₽</strong>
              <small>{optionOf("term", alt.term).short} · {optionOf("payment", alt.payment).short} · {optionOf("warranty", alt.warranty).value} месяца</small>
              <p>{altNote(pkg, alt)}</p>
            </>
          ) : <p>Другой пакет внутри ваших красных линий поставщик бы не принял.</p>}
        </section>
        <section className="panel fr-next">
          <h2 className="fr-kicker">Для следующей попытки</h2>
          <p>{report.text.nextAttempt}</p>
        </section>

        <p className="fr-foot">Результат тренировки сохранён в истории и не изменяет общую статистику навыков</p>
      </AppLayout>
    </Stage>
  );
}

function altNote(final: Package, alt: Package) {
  const moved = (["price", "term", "payment"] as const).filter((id) => alt[id] !== final[id]).map((id) => conditions[id].title.toLowerCase());
  const qty = optionOf("qty", alt.qty).value;
  const cheaper = sumOf(alt) < sumOf(final);
  const unitMore = alt.price > final.price;
  return `Здесь уступками становятся ${moved.join(", ") || "другие условия"} — объём остаётся ${qty} штук.${cheaper ? " Дешевле по сумме" : ""}${cheaper && unitMore ? ", дороже за единицу." : cheaper ? "." : ""}`;
}

export { questions, criteria };
