import { useMemo, useState } from "react";
import { difficultyLower, formatLabels, formatMoney, methods } from "../../../shared/table/scenario";
import type { FormatId, HistoryItem } from "../../../shared/table/types";
import { Stage } from "@/table/components/stage";
import { AppLayout } from "@/table/components/layout";
import { HandText } from "@/table/components/hand-text";
import { CtaButton } from "@/table/components/controls";
import { navigate } from "@/table/lib/router";
import { cn } from "@/lib/utils";
import { readHistory } from "@/table/services/history";

const MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];
const PAGE = 7;

function plural(value: number, forms: [string, string, string]) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

const day = (iso: string) => {
  const date = new Date(iso);
  return {
    date: `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
};

function FormatIcon({ format }: { format: FormatId }) {
  return (
    <svg className="hs-format" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="22" fill="#544C4C" />
      {format === "table" && (
        <>
          <rect x="9" y="16" width="26" height="12" rx="6" fill="none" stroke="#CDDFF8" strokeWidth="2" />
          <circle cx="15" cy="22" r="2" fill="#FF6547" /><circle cx="22" cy="22" r="2" fill="#FF6547" /><circle cx="29" cy="22" r="2" fill="#FF6547" />
        </>
      )}
      {format === "ai" && [[10, 18, 8, "#CDDFF8"], [15.5, 14, 16, "#FF6547"], [21, 17, 10, "#CDDFF8"], [26.5, 13, 18, "#FF6547"], [32, 18, 8, "#CDDFF8"]].map(([x, y, h, color]) => (
        <rect key={String(x)} x={Number(x)} y={Number(y)} width="3" height={Number(h)} rx="1.5" fill={String(color)} />
      ))}
      {format === "choice" && (
        <>
          <rect x="13" y="10" width="18" height="24" rx="4" fill="#CDDFF8" />
          <path d="M19 27V17.5H23C24.7 17.5 25.6 18.4 25.6 19.6C25.6 20.7 24.9 21.4 23.9 21.6C25.1 21.8 26 22.6 26 23.9C26 25.6 24.8 27 22.6 27H19Z" fill="none" stroke="#FF6547" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

function OutcomeIcon({ deal }: { deal: boolean }) {
  return deal ? (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.75" fill="none" stroke="#FF6547" strokeWidth="2.5" /><path d="M5.4 9.3L7.8 11.4L12.4 6.6" fill="none" stroke="#FF6547" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.75" fill="none" stroke="#F2E5CD" strokeWidth="2.5" /><path d="M6 6L12 12M12 6L6 12" stroke="#F2E5CD" strokeWidth="2.2" strokeLinecap="round" /></svg>
  );
}

function stats(items: HistoryItem[]) {
  const scored = items.filter((item) => item.score >= 0);
  const average = scored.length ? scored.reduce((total, item) => total + item.score, 0) / scored.length : null;
  return {
    count: items.length,
    minutes: items.reduce((total, item) => total + item.minutes, 0),
    deals: items.filter((item) => item.deal).length,
    average,
  };
}

/** Average score per week of the month of the latest training. */
function weeks(items: HistoryItem[]) {
  const latest = items[0] ? new Date(items[0].finishedAt) : new Date();
  const month = latest.getMonth();
  const year = latest.getFullYear();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const ranges: [number, number][] = [[1, 7], [8, 14], [15, 21], [22, lastDay]];
  return ranges.map(([from, to]) => {
    const inRange = items.filter((item) => {
      const date = new Date(item.finishedAt);
      return date.getMonth() === month && date.getFullYear() === year && date.getDate() >= from && date.getDate() <= to && item.score >= 0;
    });
    const value = inRange.length ? inRange.reduce((total, item) => total + item.score, 0) / inRange.length : null;
    return { label: `${from}–${to}`, value };
  });
}

const comma = (value: number) => value.toFixed(1).replace(".", ",");

export function HistoryScreen() {
  const all = useMemo(() => readHistory().sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt)), []);
  const [filter, setFilter] = useState<FormatId | "all">("all");
  const [shown, setShown] = useState(PAGE);
  const items = filter === "all" ? all : all.filter((item) => item.format === filter);
  const summary = stats(all);
  const title = "История тренировок";
  const breadcrumb = "Главная/Тренировка/История тренировок";
  const month = MONTHS[(all[0] ? new Date(all[0].finishedAt) : new Date()).getMonth()];

  if (all.length === 0) {
    return (
      <Stage label={title}>
        <AppLayout title={title} breadcrumb={breadcrumb} active="training">
          <section className="panel hs-chrono is-empty">
            <h2>Хронология</h2>
            <div className="hs-empty">
              <img className="asset" src="/assets/chips-pill.svg" alt="" width="304" height="124" style={{ left: 397.8, top: 248.2 }} />
              <h3>Здесь пока пусто</h3>
              <p>Каждая тренировка появится в хронологии: дата, формат, итог,<br />оценка навыка и полный разбор.</p>
              <CtaButton variant="orange" box={{ left: 282.4, top: 590, width: 535.1, height: 60 }} fontSize={24.4} onClick={() => navigate("settings")}>Собрать первую тренировку</CtaButton>
              <small>Результаты тренировок не меняют подтверждённую статистику навыков</small>
            </div>
          </section>
          <section className="panel hs-summary is-empty">
            <h2>Сводка</h2>
            <div className="hs-stat" style={{ left: 36.7, top: 88.5 }}><HandText text="0" size={37} color="#FF6547" /><span>тренировок</span></div>
            <div className="hs-stat" style={{ left: 266.7, top: 88.5 }}><HandText text="0" size={37} color="#CDDFF8" /><span>мин практики</span></div>
            <div className="hs-stat is-dash" style={{ left: 36, top: 180 }}><i /><span>сделок</span></div>
            <div className="hs-stat is-dash" style={{ left: 266, top: 180 }}><i /><span>средняя оценка</span></div>
          </section>
          <section className="panel hs-dynamics is-empty">
            <h2>Динамика</h2>
            <p>Средняя оценка навыка по неделям {month === "май" ? "мая" : month.replace(/ь$/, "я").replace(/т$/, "та")}</p>
            <div className="hs-chart-empty"><span>Появится после трёх тренировок</span></div>
          </section>
          <section className="panel hs-how">
            <h2>Как это работает</h2>
            <p>История собирается сама: после каждой тренировки здесь появляется строка с итогом и ссылкой на разбор. Лучшие результаты и рекомендации — с третьей тренировки.</p>
          </section>
        </AppLayout>
      </Stage>
    );
  }

  const counts = (id: FormatId) => all.filter((item) => item.format === id).length;
  const chips: { id: FormatId | "all"; label: string }[] = [
    { id: "all", label: `Все · ${all.length}` },
    { id: "ai", label: `Переговоры с AI · ${counts("ai")}` },
    { id: "table", label: `Стол переговоров · ${counts("table")}` },
    { id: "choice", label: `Выбор ответа · ${counts("choice")}` },
  ];
  const page = items.slice(0, shown);
  const best = [...all].sort((a, b) => b.points - a.points)[0];
  const bars = weeks(all);
  const monthGenitive = month === "май" ? "мая" : month === "март" ? "марта" : month === "август" ? "августа" : month.replace(/ь$/, "я");

  return (
    <Stage label={title}>
      <AppLayout title={title} breadcrumb={breadcrumb} active="training">
        <section className="panel hs-chrono">
          <h2>Хронология</h2>
          <p className="hs-count">{summary.count} {plural(summary.count, ["тренировка", "тренировки", "тренировок"])} за {month}</p>
          <div className="hs-filters" role="radiogroup" aria-label="Формат">
            {chips.map((chip) => (
              <button key={chip.id} type="button" role="radio" aria-checked={filter === chip.id} className={cn(filter === chip.id && "is-on")} onClick={() => { setFilter(chip.id); setShown(PAGE); }}>
                {chip.label}
              </button>
            ))}
          </div>
          <div className="hs-head">
            <span style={{ left: 56.2 }}>Дата</span>
            <span style={{ left: 176.8 }}>Формат и сценарий</span>
            <span style={{ left: 493.1 }}>Навык · методика</span>
            <span style={{ left: 701.1 }}>Итог</span>
            <span style={{ left: 852.8 }}>Оценка навыка</span>
          </div>
          <ol className="hs-rows">
            {page.length === 0 && <li className="hs-row-empty">В этом формате тренировок пока нет.</li>}
            {page.map((item, index) => {
              const when = day(item.finishedAt);
              const method = methods.find((entry) => entry.id === item.method)?.label ?? "";
              return (
                <li key={item.id} className={cn("hs-row", index === 0 && filter === "all" && "is-latest")} style={{ top: 88 * index }}>
                  <span className="hs-date">{when.date}</span>
                  <span className="hs-time">{when.time}</span>
                  <FormatIcon format={item.format} />
                  <strong className="hs-title">{item.title}</strong>
                  <span className="hs-sub">{formatLabels[item.format]} · {difficultyLower[item.difficulty]} · {item.minutes} мин</span>
                  <span className="hs-skill">{item.skill}</span>
                  <span className="hs-method">{method}</span>
                  <span className={cn("hs-outcome", item.deal ? "is-deal" : "is-no-deal")}><OutcomeIcon deal={item.deal} />{item.deal ? "Сделка" : "Без сделки"}</span>
                  <span className="hs-outcome-sub">{item.deal ? `${formatMoney(item.sum)} ₽` : `${item.points} очков`}</span>
                  <span className="hs-score" aria-label={item.score >= 0 ? `${item.score} из 4` : "оценка не готова"}>
                    {[0, 1, 2, 3].map((dot) => <i key={dot} className={cn(item.score >= 0 && dot < item.score && "is-on")} />)}
                    <b>{item.score >= 0 ? `${item.score}/4` : "—"}</b>
                  </span>
                  <button type="button" className="hs-open" onClick={() => navigate("report", { id: item.id })}>Разбор</button>
                </li>
              );
            })}
          </ol>
          <p className="hs-shown">Показаны {page.length} из {items.length}</p>
          {items.length > shown && <button type="button" className="hs-more" onClick={() => setShown((value) => value + PAGE)}>Показать ещё ↓</button>}
        </section>

        <section className="panel hs-summary">
          <h2>Сводка</h2>
          <div className="hs-stat" style={{ left: 36, top: 87.5 }}><HandText text={String(summary.count)} size={37} color="#FF6547" /><span>{plural(summary.count, ["тренировка", "тренировки", "тренировок"])}</span></div>
          <div className="hs-stat" style={{ left: 266, top: 87.5 }}><HandText text={String(summary.minutes)} size={37} color="#CDDFF8" /><span>мин практики</span></div>
          <div className="hs-stat" style={{ left: 36.3, top: 163.5 }}><HandText text={`${summary.deals}/${summary.count}`} size={37} color="#CDDFF8" /><span>сделок</span></div>
          <div className="hs-stat" style={{ left: 267.4, top: 163.5 }}>
            {summary.average === null ? <i className="hs-dash" /> : <HandText text={comma(summary.average)} size={37} color="#CDDFF8" />}
            <span>средняя оценка</span>
          </div>
        </section>

        <section className="panel hs-dynamics">
          <h2>Динамика</h2>
          <p>Средняя оценка навыка по неделям {monthGenitive}</p>
          {all.length < 3 ? (
            <div className="hs-chart-empty" style={{ top: 112 }}><span>Появится после трёх тренировок</span></div>
          ) : (
            <div className="hs-chart" role="img" aria-label={bars.map((bar) => `${bar.label}: ${bar.value === null ? "нет данных" : comma(bar.value)}`).join("; ")}>
              <i style={{ top: 126 }} /><i style={{ top: 156 }} /><i style={{ top: 186 }} />
              {bars.map((bar, index) => {
                const height = bar.value === null ? 0 : Math.max(6, bar.value * 30);
                const last = index === bars.length - 1 || bars.slice(index + 1).every((next) => next.value === null);
                return (
                  <div key={bar.label} className={cn("hs-bar", last && bar.value !== null && "is-accent")} style={{ left: 60 + 104 * index }}>
                    <span style={{ height }} />
                    <b style={{ bottom: height + 8 }}>{bar.value === null ? "—" : comma(bar.value)}</b>
                    <small>{bar.label}</small>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel hs-best">
          <p className="hs-best-kicker">Лучший результат</p>
          <strong>{best.title} · {best.points} {plural(best.points, ["очко", "очка", "очков"])}</strong>
          <p className="hs-best-kicker" style={{ top: 90 }}>Что потренировать дальше</p>
          <p className="hs-best-text">
            {summary.average !== null && summary.average < 3
              ? `${best.skill} — ${comma(summary.average)}/4, ниже цели. Ставьте уступку в пару «если…, то…» и попробуйте «Стол переговоров» на средней сложности.`
              : "Уступки вы уже связываете со встречным шагом. Попробуйте «Стол переговоров» на высокой сложности."}
          </p>
        </section>

        <CtaButton variant="orange" box={{ left: 1332, top: 963.2, width: 498, height: 60 }} fontSize={24.4} onClick={() => navigate("settings")}>Собрать тренировку</CtaButton>
      </AppLayout>
    </Stage>
  );
}
