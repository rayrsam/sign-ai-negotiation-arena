import { BUDGET, CONDITION_IDS, conditions, formatMoney, optionOf, packageLine, scenario, subtitleOf, sumOf } from "../../../shared/table/scenario";
import type { Package, TableState } from "../../../shared/table/types";
import { Stage } from "@/table/components/stage";
import { TableHeader } from "@/table/components/layout";
import { HandText } from "@/table/components/hand-text";
import { CheckCircleIcon, LockIcon } from "@/table/components/icons";
import { CtaButton, OutlineButton } from "@/table/components/controls";
import { concessionSteps, useReport } from "@/table/hooks/use-report";
import { clock } from "@/table/hooks/use-table";
import { Redirect, currentParams, navigate } from "@/table/lib/router";
import { cn } from "@/lib/utils";

// Stroke numerals of the stage track, traced from the mockup (shared design system geometry).
const NUMERALS = [
  { box: "740 75 24 38", d: "M742.707 101.632C750.795 100.855 757.442 94.9543 759.134 87.0522L760.146 82.3279C760.209 82.0294 760.652 82.0813 760.644 82.3864L759.956 110.06" },
  { box: "880 78 24 36", d: "M882.781 90.5091L883.595 88.366C885.06 84.5083 889.069 82.2236 893.157 82.9161C900.255 84.1183 902.868 92.9032 897.57 97.7509L884.259 109.931C883.846 110.309 884.293 110.966 884.798 110.726L891.158 107.704C894.428 106.15 898.349 107.263 900.301 110.298" },
  { box: "1014 76 26 36", d: "M1017.27 86.586C1017.23 82.9973 1020.02 80.005 1023.63 79.768L1026.07 79.6068C1031.6 79.2434 1036.24 83.6796 1036.09 89.1809L1036.08 89.5725C1035.95 94.3064 1032.41 98.2575 1027.69 98.9206L1018.49 100.215L1031.63 100.004C1033.97 99.9662 1035.88 101.872 1035.83 104.204C1035.79 106.297 1034.17 108.023 1032.06 108.212L1022 109.117C1020.06 109.291 1018.26 108.123 1017.64 106.293" },
  { box: "1136 74 28 40", d: "M1161.07 77.0508C1160.07 84.7804 1155.77 91.7044 1149.25 96.037L1139.86 102.286C1139.4 102.592 1139.68 103.306 1140.22 103.226L1157.64 100.702C1159.49 100.434 1161.13 101.898 1161.05 103.75L1160.79 110.254" },
];
const CENTERS = [759.5, 893, 1026, 1159.4];
const LABELS = ["Разведка", "Обмен", "Пакет", "Фиксация"];

function StageTrack() {
  return (
    <ol className="rs-track" aria-label="Этапы тренировки">
      <i className="rs-track-line" aria-hidden="true" />
      {NUMERALS.map((numeral, index) => {
        const [x, y, w, h] = numeral.box.split(" ").map(Number);
        const active = index === 3;
        return (
          <li key={index} className={cn(active && "is-active")} aria-current={active ? "step" : undefined}>
            <svg style={{ left: x, top: y - 2 }} width={w} height={h} viewBox={numeral.box} fill="none" aria-hidden="true">
              <path d={numeral.d} stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="rs-track-dot" style={{ left: CENTERS[index] }} />
            <span className="rs-track-label" style={{ left: CENTERS[index] }}>{LABELS[index]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function FinalChip({ id, index, agreed, left }: { id: (typeof CONDITION_IDS)[number]; index: number; agreed: boolean; left: number }) {
  const option = optionOf(id, index);
  return (
    <div className={cn("rs-chip", agreed ? "is-agreed" : "is-you")} style={{ left }}>
      <div className="rs-chip-disc">
        {!agreed && (
          <svg className="rs-chip-ring" width="144" height="144" viewBox="0 0 144 144" aria-hidden="true"><circle cx="72" cy="72" r="69.5" /></svg>
        )}
        <span className="rs-chip-head">{conditions[id].head}</span>
        <strong>{option.chip}</strong>
        <span className="rs-chip-unit">{option.unit}</span>
      </div>
      <span className="rs-chip-tag">{agreed ? <LockIcon /> : <i />}{agreed ? "согласовано" : "вы"}</span>
      <span className="rs-chip-goal">{conditions[id].goalLabel}</span>
    </div>
  );
}

function lastTurn(state: TableState) {
  return state.moves.at(-1)?.turn ?? 0;
}

/** «Стол · 15 · соглашение достигнуто» and «T16 · Завершение без сделки». */
export function ResultScreen() {
  const id = currentParams().get("id");
  const { state, report, error, retry } = useReport(id);

  if (!id) return <Redirect to="settings" />;
  if (!state) {
    return <Stage label="Итог тренировки"><p className="center-note">{error ?? "Подводим итог…"}</p></Stage>;
  }
  if (state.status === "active") return <Redirect to="table" params={{ id: state.id }} />;
  if (state.status === "aborted") return <Redirect to="settings" />;

  const deal = state.status === "deal";
  const pkg: Package = deal ? state.acceptedPackage! : state.lastProposal ?? state.position;
  const steps = concessionSteps(state);
  const turn = lastTurn(state);
  const sumText = formatMoney(sumOf(pkg));
  const summaryText = report?.text.skillSummary ?? (error ? "Разбор пока не готов — повторите чуть позже." : "Готовим разбор ваших уступок…");

  return (
    <Stage label={deal ? "Соглашение достигнуто" : "Соглашение не достигнуто"}>
      <TableHeader title={scenario.title} subtitle={subtitleOf(state.settings, state.maxTurns)}>
        {deal && <StageTrack />}
        <OutlineButton box={{ left: 1641.8, top: 42, width: 162.3, height: 60 }} onClick={() => navigate("settings")}>Выйти</OutlineButton>
      </TableHeader>

      <div className={cn("rs-head", !deal && "is-no-deal")}>
        <p className="rs-kicker">
          Ход {turn} из {state.maxTurns} · {clock(state.elapsedSec)}{!deal && state.endReason === "turns" ? " · ходы закончились" : ""}
        </p>
        <h2>{deal ? "Соглашение достигнуто" : "Соглашение не достигнуто"}</h2>
        <p className="rs-sub">{deal ? "Поставщик принял пакет, вы подтвердили резюме" : "Отказ от сделки хуже ваших красных линий может быть верным решением"}</p>
      </div>

      {deal && (
        <section className="rs-sum" aria-label={`Сумма пакета ${sumText} ₽`}>
          <p>Сумма пакета</p>
          <span className="rs-sum-value">
            <HandText text={sumText} size={42} color="#CDDFF8" gap={8.3} />
            <small>₽</small>
          </span>
          <span className="rs-sum-check">
            <CheckCircleIcon size={24} />
            {sumOf(pkg) <= BUDGET ? "в бюджете" : "выше бюджета"} {formatMoney(BUDGET)} ₽
          </span>
        </section>
      )}

      <section className={cn("rs-table", !deal && "is-no-deal")} aria-label={deal ? "Итоговый пакет" : "Ваше последнее предложение"}>
        <div className="rs-table-inner" />
        <h3>{deal ? "итоговый пакет" : `ваше последнее предложение · ${sumText} ₽`}</h3>
        {CONDITION_IDS.map((cid, index) => (
          <FinalChip key={cid} id={cid} index={pkg[cid]} agreed={deal} left={88 + 290 * index} />
        ))}
      </section>

      {deal ? (
        <>
          <section className="panel rs-stat" style={{ left: 120 }}>
            <p className="rs-stat-kicker">Уступки</p>
            <strong>{steps.used} из {state.tokensTotal}</strong>
            <small>{steps.free === 0 ? (steps.used ? "все — в обмен на встречный шаг" : "сделка без уступок") : `${steps.free} — без встречного шага`}</small>
          </section>
          <section className="panel rs-stat" style={{ left: 420 }}>
            <p className="rs-stat-kicker">Игровые очки</p>
            <strong>{state.points}</strong>
            <small>не оценка навыка</small>
          </section>
          <section className="panel rs-stat" style={{ left: 720 }}>
            <p className="rs-stat-kicker">Доверие</p>
            <strong>{state.trust}%</strong>
            <small>{state.trust >= 70 ? "поставщик доволен обменом" : state.trust >= 50 ? "поставщик держит дистанцию" : "поставщик насторожен"}</small>
          </section>
          <section className="panel rs-skill">
            <p className="rs-skill-kicker">{state.settings.skill}</p>
            <p className={cn("rs-skill-text", !report && "is-loading")}>{summaryText}</p>
            {error && <button type="button" className="rs-retry" onClick={retry}>Повторить разбор</button>}
          </section>
          <p className="rs-foot">Результат тренировки не изменяет общую статистику навыков</p>
          <CtaButton variant="dark" weight={400} box={{ left: 1040, top: 963, width: 360, height: 60 }} onClick={() => navigate("settings")}>В тренировки</CtaButton>
          <CtaButton variant="orange" weight={400} box={{ left: 1424, top: 963, width: 376, height: 60 }} onClick={() => navigate("full-report", { id: state.id })}>Полный отчёт</CtaButton>
        </>
      ) : (
        <>
          <section className="panel rs-card" style={{ left: 120, width: 450 }}>
            <p className="rs-card-kicker">Поставщик предлагал</p>
            <strong>{packageLine(state.supplierOffer)}</strong>
            <small>{formatMoney(sumOf(state.supplierOffer))} ₽ — вы не приняли</small>
          </section>
          <section className="panel rs-card is-backup" style={{ left: 590, width: 450 }}>
            <p className="rs-card-kicker">Запасной вариант</p>
            <strong>{packageLine(scenario.backup)}</strong>
            <small>{formatMoney(sumOf(scenario.backup))} ₽ — остаётся доступен</small>
          </section>
          <section className="panel rs-card is-lesson" style={{ left: 1060, width: 740 }}>
            <p className="rs-card-kicker">Главный вывод</p>
            <p className={cn("rs-lesson", !report && "is-loading")}>{summaryText}</p>
            {error && <button type="button" className="rs-retry" onClick={retry}>Повторить разбор</button>}
          </section>
          <p className="rs-foot">Результат тренировки не изменяет общую статистику навыков</p>
          <CtaButton variant="dark" box={{ left: 1040, top: 963, width: 360, height: 60 }} onClick={() => navigate("settings")}>Пройти ещё раз</CtaButton>
          <CtaButton variant="orange" box={{ left: 1424, top: 963, width: 376, height: 60 }} onClick={() => navigate("full-report", { id: state.id })}>Полный отчёт</CtaButton>
        </>
      )}
    </Stage>
  );
}
