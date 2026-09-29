import { useState } from "react";
import { Stage } from "@/table/components/stage";
import { AppLayout } from "@/table/components/layout";
import { HandText } from "@/table/components/hand-text";
import { CheckCircleIcon, QuestionCircleIcon, TriangleIcon } from "@/table/components/icons";
import { CtaButton } from "@/table/components/controls";
import { concessionSteps, useReport } from "@/table/hooks/use-report";
import { backupComparison, finalPackage, lastOfferLine, packageFormula, redLinesKept, tokenUses } from "@/table/lib/report-view";
import { Redirect, currentParams, navigate } from "@/table/lib/router";
import { cn } from "@/lib/utils";
import { startTable } from "@/table/services/api";

/** T17 / T18 · Краткий отчёт (with and without a deal). */
export function ReportScreen() {
  const id = currentParams().get("id");
  const { state, report, error, retry } = useReport(id);
  const [busy, setBusy] = useState(false);
  const title = "Краткий отчёт";
  const breadcrumb = "Главная/Тренировка/Стол переговоров/Краткий отчёт";

  if (!id) return <Redirect to="history" />;
  if (!state) {
    return (
      <Stage label={title}>
        <AppLayout title={title} breadcrumb={breadcrumb} active="training"><p className="center-note">{error ?? "Собираем отчёт…"}</p></AppLayout>
      </Stage>
    );
  }
  if (state.status === "active") return <Redirect to="table" params={{ id: state.id }} />;

  const deal = state.status === "deal";
  const pkg = finalPackage(state);
  const steps = concessionSteps(state);
  const uses = tokenUses(state);
  const kept = redLinesKept(state);
  const score = report?.score ?? null;

  async function repeat() {
    if (!state || busy) return;
    setBusy(true);
    try {
      const next = await startTable(state.settings);
      navigate("howto", { id: next.id, start: "1" });
    } catch {
      setBusy(false);
    }
  }

  const placeholder = error ? "Разбор пока не готов" : "Готовим разбор…";
  const strengths = report?.text.strengths ?? [placeholder, ""];
  const growth = report?.text.growth ?? [placeholder, ""];

  return (
    <Stage label={title}>
      <AppLayout title={title} breadcrumb={breadcrumb} active="training">
        <section className="panel sr-main">
          <h2>{deal ? "Соглашение достигнуто" : "Соглашение не достигнуто"}</h2>
          <p className="sr-formula">{deal ? packageFormula(pkg) : `Последнее предложение: ${lastOfferLine(pkg)}`}</p>
          <div className="sr-count" aria-label={`Уступки: ${steps.used} из ${state.tokensTotal}`}>
            <HandText text={`${steps.used}/`} size={46} color={deal ? "#FF6547" : "#F2E5CD"} />
            <HandText text={String(state.tokensTotal)} size={46} color="#FF6547" />
          </div>
          <p className="sr-count-label">уступки</p>
          <ol className="sr-tokens">
            {uses.slice(0, 3).map((use) => (
              <li key={use.index} className={cn("sr-token", `is-${use.state}`)}>
                <span>Уступка {use.index}</span>
                {use.state !== "unused" && <HandText className="sr-token-number" text={String(use.index)} size={74} color="#544C4C" />}
                <small>{use.caption}</small>
              </li>
            ))}
          </ol>
          <h3 className="sr-backup-title">Запасной вариант</h3>
          <p className="sr-backup">{backupComparison(state)}</p>
          <p className="sr-lines">
            {!kept ? <TriangleIcon size={24} /> : deal ? <CheckCircleIcon size={26} /> : <QuestionCircleIcon size={28} />}
            {!kept ? "Красная линия нарушена — это учтено в оценке" : deal ? "Красные линии соблюдены" : "Красные линии соблюдены, сделки нет"}
          </p>
        </section>

        <h2 className="sr-skill-title">Навык тренировки</h2>
        <div className="sr-row" style={{ top: 280 }}>
          <span>{state.settings.skill}</span>
          <span className={cn("sr-score", score !== null && score >= 3 ? "is-good" : "is-mid")} aria-label={score === null ? "оценка готовится" : `${score} из 4`}>
            {[0, 1, 2, 3].map((index) => <i key={index} className={cn(score !== null && index < score && "is-on")} />)}
          </span>
        </div>
        <div className="sr-row" style={{ top: 349 }}>
          <span>Игровые очки</span>
          <small>{state.points} из 100</small>
        </div>
        <section className="panel sr-tokens-box">
          <p>Жетоны и уступки</p>
          <strong>Использовано {steps.used} из {state.tokensTotal} · условных {steps.conditional} · бесплатных {steps.free}</strong>
          <small>Результат тренировки не изменяет общую статистику</small>
        </section>

        <section className="panel sr-strong">
          <h3>Сильные действия</h3>
          <ul>
            {strengths.filter(Boolean).map((item) => (
              <li key={item} className={cn(!report && "is-loading")}><CheckCircleIcon size={36.6} color="#CDDFF8" /><span>{item}</span></li>
            ))}
          </ul>
        </section>
        <section className="panel sr-growth">
          <h3>Точки роста</h3>
          <ol>
            {growth.filter(Boolean).map((item, index) => (
              <li key={item} className={cn(!report && "is-loading")}>
                <HandText className="sr-growth-number" text={String(index + 1)} size={43} color="#F2E5CD" />
                <span>{item}</span>
              </li>
            ))}
          </ol>
          {error && <button type="button" className="rs-retry" onClick={retry}>Повторить разбор</button>}
        </section>

        <CtaButton box={{ left: 1308, top: 631, width: 522, height: 60 }} onClick={() => navigate("full-report", { id: state.id })}>Полный отчёт</CtaButton>
        <CtaButton variant="dark" box={{ left: 1308, top: 715, width: 522, height: 60 }} onClick={() => void repeat()} disabled={busy}>{busy ? "Собираем…" : "Повторить"}</CtaButton>
        <CtaButton variant="orange" box={{ left: 1308, top: 886.7, width: 522, height: 60 }} onClick={() => navigate("settings")}>Новая тренировка</CtaButton>
      </AppLayout>
    </Stage>
  );
}
