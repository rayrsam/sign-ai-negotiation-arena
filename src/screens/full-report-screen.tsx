import { useEffect, useState } from "react";
import { CounterpartyAvatar } from "@/components/counterparty-avatar";
import { ProgressNumber } from "@/components/progress-number";
import { ReportAction } from "@/components/report/report-action";
import { ReportLayout } from "@/components/report/report-layout";
import { ScoreFraction } from "@/components/report/score-fraction";
import { ReportState } from "@/components/report/report-state";
import { referenceFullReport } from "@/data/report-reference-preview";
import { useReportingAttempt } from "@/hooks/use-reporting-attempt";
import type { OpportunityAnalysis, StoredAttempt } from "@/types/reporting";

const statusLabels = {
  independent: "Освоено самостоятельно",
  supported: "Освоено с поддержкой",
  repeat: "Стоит повторить",
  unassessed: "Не удалось оценить навык",
} as const;

function turnTime(attempt: StoredAttempt, turnId?: string) {
  const turn = attempt.transcript.find((item) => item.id === turnId);
  if (!turn?.createdAt) return "время не зафиксировано";
  const elapsed = Math.max(0, Math.round((Date.parse(turn.createdAt) - Date.parse(attempt.startedAt)) / 1000));
  return `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
}

function durationLabel(attempt: StoredAttempt) {
  if (!attempt.endedAt) return "время не зафиксировано";
  const totalSeconds = Math.max(0, Math.round((Date.parse(attempt.endedAt) - Date.parse(attempt.startedAt)) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const minuteWord = minutes % 10 === 1 && minutes % 100 !== 11
    ? "минута"
    : minutes % 10 >= 2 && minutes % 10 <= 4 && (minutes % 100 < 12 || minutes % 100 > 14)
      ? "минуты"
      : "минут";
  const secondWord = seconds % 10 === 1 && seconds % 100 !== 11
    ? "секунда"
    : seconds % 10 >= 2 && seconds % 10 <= 4 && (seconds % 100 < 12 || seconds % 100 > 14)
      ? "секунды"
      : "секунд";
  return `${minutes} ${minuteWord} ${seconds} ${secondWord}`;
}

function opportunitiesHeading(count: number) {
  if (count === 1) return "Разбор одной возможности";
  if (count === 2) return "Разбор двух возможностей";
  if (count === 3) return "Разбор трёх возможностей";
  return "Разбор возможностей";
}

function CheckIcon() {
  return (
    <svg className="report-interest-icon" viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <circle cx="15" cy="15" r="14" stroke="currentColor" strokeWidth="2" />
      <path d="M8.7 15.4 12.9 19.6 21.4 10.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HypothesisIcon() {
  return (
    <svg className="report-interest-icon is-hypothesis" viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <circle cx="15" cy="15" r="14" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2.4" />
      <path d="M11.4 12a3.7 3.7 0 1 1 5.3 3.3c-1 .5-1.7 1.4-1.7 2.5v.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="15" cy="22" r="1.2" fill="currentColor" />
    </svg>
  );
}

function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const scrollRoot = document.querySelector<HTMLElement>(".report-page.full-report-page");
    if (!scrollRoot) return;

    const updateVisibility = () => setVisible(scrollRoot.scrollTop > 260);
    updateVisibility();
    scrollRoot.addEventListener("scroll", updateVisibility, { passive: true });
    return () => scrollRoot.removeEventListener("scroll", updateVisibility);
  }, []);

  const returnToTop = () => {
    document.querySelector<HTMLElement>(".report-page.full-report-page")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      className={`report-back-to-top${visible ? " is-visible" : ""}`}
      type="button"
      aria-label="Вернуться к началу страницы"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={returnToTop}
    >
      <img src="/report-sidebar/back-to-top.svg" alt="" />
    </button>
  );
}

function OpportunityCard({ item, attempt, preview }: { item: OpportunityAnalysis; attempt: StoredAttempt; preview: boolean }) {
  const replayHref = preview ? "?screen=replay" : `?screen=replay&attempt=${encodeURIComponent(attempt.id)}&turn=${encodeURIComponent(item.positionTurnId)}`;
  const score = item.score;
  return (
    <article className="report-opportunity-card">
      <div className="report-opportunity-top">
        <span>ВОЗМОЖНОСТЬ {item.opportunityId.replace("O", "")} · {turnTime(attempt, item.positionTurnId)}</span>
        <strong aria-label={score === null ? "Не оценено" : `${score} из 4`}>
          {score !== null && score >= 1 && score <= 4 ? <ProgressNumber number={score} /> : "—"}
          <small> из 4</small>
        </strong>
      </div>
      <div className="report-opportunity-position"><small>Позиция · директор</small><p>«{item.positionText}»</p></div>
      <div className="report-quote-ticket"><span>Ваша реплика</span><i aria-hidden="true" /><p>«{item.responseText}»</p></div>
      <dl>
        <dt>Факт</dt><dd>{item.fact}</dd>
        <dt>Эффект</dt><dd>{item.effect}</dd>
        <dt>Улучшение</dt><dd>{item.improvement}</dd>
      </dl>
      <ReportAction href={replayHref}>Переиграть отсюда</ReportAction>
    </article>
  );
}

function interestNote(attempt: StoredAttempt, interest: string, confirmed: boolean) {
  const analysis = attempt.analysis!;
  const explicit = analysis.interestNotes?.[interest];
  if (explicit) return explicit;
  const opportunity = analysis.opportunities.find((item) => item.interestHypothesis === interest);
  if (confirmed && opportunity?.interestConfirmed && opportunity.reactionTurnId) {
    return `подтвердил в ответ на ваш вопрос · ${turnTime(attempt, opportunity.reactionTurnId)}`;
  }
  return confirmed ? "подтверждено в разговоре" : "вопросом не проверено";
}

function LiveFullReport({ attempt, preview = false }: { attempt: StoredAttempt; preview?: boolean }) {
  const analysis = attempt.analysis!;
  const attemptQuery = preview ? "&preview=reference" : `&attempt=${encodeURIComponent(attempt.id)}`;
  const keyTurn = attempt.transcript.find((turn) => turn.id === analysis.keyMomentTurnId);
  const keyOpportunity = analysis.opportunities.find((item) =>
    item.positionTurnId === analysis.keyMomentTurnId || item.responseTurnId === analysis.keyMomentTurnId,
  );
  const meetingConditions = analysis.outcomeConditions.length > 0
    ? analysis.outcomeConditions
    : analysis.confirmedInterests;
  const needsRepeat = analysis.status === "repeat" || analysis.status === "unassessed";

  return (
    <ReportLayout title="Полный отчёт" location="Полный отчёт" className="full-report-page">
      <div className="report-full-top">
        <section className="report-full-summary">
          <div>
            <span className="report-eyebrow">ИТОГ УРОКА</span>
            <h2>{statusLabels[analysis.status]}</h2>
            <p>Позиции и интересы · встреча с директором завода · {durationLabel(attempt)}</p>
          </div>
          <div className="report-full-score"><strong><ScoreFraction text={analysis.score === null ? "N/A" : `${analysis.score}/4`} /></strong><small>перевод позиции в интерес</small></div>
          <div className="report-full-facts">
            <div className="is-accent"><small>Самостоятельность</small><strong>{attempt.hints.length ? `с поддержкой · ${attempt.hints.length} подсказ.` : "без подсказок"}</strong></div>
            <div><small>Возможности</small><strong>{analysis.validOpportunityCount} из 3 состоялись</strong></div>
            <div><small>Исход встречи</small><strong>{analysis.outcomeShort || analysis.outcomeTitle}</strong></div>
          </div>
        </section>
        <section className="report-full-outcome">
          <div className="report-full-outcome-copy">
            <span>ИСХОД<br />ВСТРЕЧИ</span>
            <h2>{analysis.outcomeTitle}</h2>
          </div>
          <div className="report-outcome-avatar" aria-hidden="true"><CounterpartyAvatar layered /></div>
          <small className="report-full-outcome-note">Исход сделки не влияет<br />на оценку навыка</small>
        </section>
      </div>

      <section className="report-full-section report-full-opportunities">
        <h2>{opportunitiesHeading(analysis.opportunities.length)}</h2>
        {analysis.opportunities.length
          ? <div className="report-opportunities">{analysis.opportunities.map((item) => <OpportunityCard item={item} attempt={attempt} preview={preview} key={item.opportunityId} />)}</div>
          : <p className="report-section-note">В транскрипте не найдено реплик, достаточных для доказательного разбора возможностей.</p>}
      </section>

      <section className="report-full-section report-full-interests">
        <h2>Интересы директора</h2>
        <div className="report-interests">
          <div>
            <h3>ПОДТВЕРЖДЕНО КОНТРАГЕНТОМ</h3>
            {analysis.confirmedInterests.length
              ? analysis.confirmedInterests.map((interest) => (
                <p key={interest}><CheckIcon /><span>{interest}<small>{interestNote(attempt, interest, true)}</small></span></p>
              ))
              : <p><HypothesisIcon /><span>Подтверждённых интересов в этой попытке не зафиксировано.</span></p>}
          </div>
          <div>
            <h3>ОСТАЛОСЬ ГИПОТЕЗОЙ</h3>
            {analysis.unconfirmedHypotheses.length
              ? analysis.unconfirmedHypotheses.map((interest) => (
                <p key={interest}><HypothesisIcon /><span>{interest}<small>{interestNote(attempt, interest, false)}</small></span></p>
              ))
              : <p><HypothesisIcon /><span>Неподтверждённых гипотез не зафиксировано.</span></p>}
          </div>
        </div>
      </section>

      {attempt.hints.length > 0 && <section className="report-full-section report-full-hints">
        <h2>Хронология подсказок</h2>
        <div className="report-event-list">{attempt.hints.map((hint, index) => (
            <p key={hint.id}><span>H{hint.level} · {turnTime(attempt, hint.afterTurnId)}</span>Подсказка наставника {index ? "использована повторно" : "запрошена пользователем"}.</p>
          ))}</div>
      </section>}

      <div className="report-full-bottom">
        <section className="report-meeting-success">
          <h2>Исход встречи</h2>
          <p className="report-meeting-outcome-title">{analysis.outcomeTitle}</p>
          <strong className="report-meeting-conditions-title">{analysis.outcomeConditions.length > 0 ? "Условия, которые он назвал:" : "Подтверждённые интересы:"}</strong>
          {meetingConditions.length > 0
            ? <ul className="report-meeting-conditions">{meetingConditions.map((condition) => <li key={condition}>{condition}</li>)}</ul>
            : <p className="report-meeting-details">{analysis.outcomeDetails || "Подтверждённые условия встречи не зафиксированы."}</p>}
          <small>Исход показан отдельно и не влияет на оценку навыка.</small>
        </section>
        <section className="report-key-moment">
          <h2>Ключевая точка</h2>
          {keyOpportunity ? (
            <div className="report-quote-ticket report-key-moment-ticket">
              <span>{turnTime(attempt, keyOpportunity.positionTurnId)} · директор</span><i aria-hidden="true" />
              <p>«{keyOpportunity.positionText}»</p>
              <p className="report-key-moment-response"><strong>Вы ответили: «{keyOpportunity.responseText}»</strong></p>
            </div>
          ) : keyTurn ? (
            <div className="report-quote-ticket"><span>{turnTime(attempt, keyTurn.id)} · {keyTurn.role === "assistant" ? "директор" : "вы"}</span><i aria-hidden="true" /><p>«{keyTurn.content}»</p></div>
          ) : <p>Ключевой момент не определён.</p>}
          <small className="report-key-moment-guidance">Что попробовать: {(keyOpportunity?.improvement || analysis.improvedWording || analysis.nextStep).replace(/^./, (letter) => letter.toLowerCase())}</small>
          {analysis.keyMomentTurnId && <ReportAction href={`?screen=replay${attemptQuery}&turn=${encodeURIComponent(analysis.keyMomentTurnId)}`}>Переиграть отсюда</ReportAction>}
        </section>
        <section className="report-next-lesson">
          <span className="report-eyebrow">{needsRepeat ? "РЕКОМЕНДАЦИЯ" : "СЛЕДУЮЩИЙ УРОК"}</span>
          <h2>{needsRepeat ? "Повторить ситуацию" : "Варианты взаимной выгоды"}</h2>
          <p className="report-next-lesson-label">{needsRepeat ? "Блок 3 · Урок 2" : "Блок 3 · Урок 3"}</p>
          <p>{needsRepeat ? analysis.nextStep : "Как предложить несколько вариантов, не уступая заранее"}</p>
        </section>
        <div className="report-next-lesson-action">
          <ReportAction primary href={needsRepeat ? "?screen=brief&id=32" : `?screen=lesson-outcome${attemptQuery}`}>
            {needsRepeat ? "Повторить урок" : "Следующий урок"}
          </ReportAction>
        </div>
      </div>
      <BackToTopButton />
    </ReportLayout>
  );
}

export function FullReportScreen() {
  const isReferencePreview = new URLSearchParams(window.location.search).get("preview") === "reference";
  const reporting = useReportingAttempt(!isReferencePreview);
  if (isReferencePreview) return <LiveFullReport attempt={referenceFullReport} preview />;
  if (!reporting.attempt || !reporting.attempt.analysis) {
    return <ReportState title="Полный отчёт" attempt={reporting.attempt} isAnalyzing={reporting.isAnalyzing} error={reporting.error} onRetry={reporting.retry} />;
  }
  return <LiveFullReport attempt={reporting.attempt} />;
}
