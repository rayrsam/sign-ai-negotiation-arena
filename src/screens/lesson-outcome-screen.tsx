import { useState } from "react";
import { ProgressNumber } from "@/components/progress-number";
import { ReportAction } from "@/components/report/report-action";
import { ReportLayout } from "@/components/report/report-layout";
import { ScoreFraction } from "@/components/report/score-fraction";
import { ReportState } from "@/components/report/report-state";
import { referenceFullReport } from "@/data/report-reference-preview";
import { useReportingAttempt } from "@/hooks/use-reporting-attempt";
import type { StoredAttempt } from "@/types/reporting";

const stages = [
  { number: 1, title: "Теория", detail: "4 из 4 ситуаций", note: "одна — со 2-й попытки" },
  { number: 2, title: "Бриф", detail: "роль и задача", note: "прочитан за 1 минуту" },
  { number: 3, title: "Встреча", detail: "3 из 4 · без подсказок", note: "пилот обсуждается" },
  { number: 4, title: "Разбор", detail: "1 момент к повтору", note: "возможность 2 · 04:10" },
] as const;

/** Level of «Выявление интересов» on the skill map before this lesson (0–10). */
const SKILL_MAP_BEFORE = 6;
const SKILL_MAP_SIZE = 10;

function durationLabel(attempt: StoredAttempt, preview: boolean) {
  if (preview) return "14 минут 30 секунд";
  if (!attempt.endedAt) return "встреча завершена";
  const seconds = Math.max(0, Math.round((Date.parse(attempt.endedAt) - Date.parse(attempt.startedAt)) / 1000));
  return `${Math.floor(seconds / 60)} минут ${String(seconds % 60).padStart(2, "0")} секунд`;
}

function elapsedLabel(attempt: StoredAttempt, turnId?: string) {
  const turn = attempt.transcript.find((item) => item.id === turnId);
  if (!turn?.createdAt) return "";
  const seconds = Math.max(0, Math.round((Date.parse(turn.createdAt) - Date.parse(attempt.startedAt)) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function RepeatCircle() {
  return (
    <svg className="lesson-outcome-check" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2.4" />
      <path d="M9 14a5 5 0 1 0 1.6-3.7M9 8.5v3.2h3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircle() {
  return (
    <svg className="lesson-outcome-check" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="2" />
      <path d="M8.1 14.5 12 18.5 20.3 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LessonOutcomeContent({ attempt, preview }: { attempt: StoredAttempt; preview: boolean }) {
  const [nextNotice, setNextNotice] = useState(false);
  const analysis = attempt.analysis!;
  const success = analysis.status === "independent" || analysis.status === "supported";
  const quoteItem = analysis.opportunities.find((item) => item.interestConfirmed) || analysis.opportunities.find((item) => item.responseText);
  const quote = preview
    ? "Правильно понимаю, для вас главное — не перегрузить мастеров и не сорвать запуск?"
    : quoteItem?.responseText || "Повторите ситуацию, чтобы проверить интересы директора.";
  const reportHref = preview ? "?screen=full-report&preview=reference" : `?screen=full-report&attempt=${encodeURIComponent(attempt.id)}`;
  const score = analysis.score === null ? "N/A" : `${analysis.score}/4`;
  const meetingDetail = `${analysis.score === null ? "N/A" : `${analysis.score} из 4`} · ${attempt.hints.length ? "с подсказкой" : "без подсказок"}`;
  const mapGain = success ? 1 : 0;
  const mapAfter = Math.min(SKILL_MAP_SIZE, SKILL_MAP_BEFORE + mapGain);
  const keyOpportunity = analysis.opportunities.find((item) =>
    item.positionTurnId === analysis.keyMomentTurnId || item.responseTurnId === analysis.keyMomentTurnId);
  const keyMoment = [
    keyOpportunity ? `возможность ${keyOpportunity.opportunityId.replace(/^O/, "")}` : "ключевая точка",
    elapsedLabel(attempt, analysis.keyMomentTurnId),
  ].filter(Boolean).join(" · ");
  // Theory and brief happen before the meeting and are not recorded in the attempt.
  const stageTexts: [string, string][] = preview
    ? stages.map((stage) => [stage.detail, stage.note])
    : [
      ["материал урока", "не влияет на карту навыков"],
      ["роль и задача", "прочитаны перед встречей"],
      [meetingDetail, analysis.outcomeTitle],
      analysis.keyMomentTurnId
        ? ["1 момент к повтору", keyMoment]
        : [`точки разбора: ${analysis.opportunities.length}`, "полный отчёт готов"],
    ];
  const quoteTime = preview ? "01:05" : elapsedLabel(attempt, quoteItem?.responseTurnId);
  const confirmedNote = preview
    ? "Директор подтвердил интерес —\nразговор перешёл от отсрочки к пилоту"
    : "Директор подтвердил интерес —\nразговор перешёл от позиции к смыслу";

  return (
    <ReportLayout title="Итог урока" location="Итог урока" className="lesson-outcome-page">
      <div className="lesson-outcome-grid">
        <div className="lesson-outcome-left">
          <section className="lesson-outcome-summary" aria-label="Урок завершён">
            <div className="lesson-outcome-summary-head">
              <div>
                <span className="report-eyebrow">БЛОК 3 · УРОК 2 · ПОЗИЦИИ И ИНТЕРЕСЫ</span>
                <h2>{success ? "Урок пройден" : "Урок стоит повторить"}</h2>
                <p>{preview ? "Теория, встреча с директором завода и разбор" : "Встреча с директором завода и разбор"} · {durationLabel(attempt, preview)}</p>
              </div>
              <div className="lesson-outcome-score"><strong><ScoreFraction text={score} /></strong><small>навык урока</small></div>
            </div>
            <ol className="lesson-outcome-stages">
              {stages.map((stage, index) => (
                <li key={stage.number}>
                  <div className="lesson-outcome-stage-head"><ProgressNumber number={stage.number} /><CheckCircle /></div>
                  <strong>{stage.title}</strong>
                  <span>{stageTexts[index][0]}</span>
                  <small>{stageTexts[index][1]}</small>
                </li>
              ))}
            </ol>
          </section>

          <div className="lesson-outcome-notes">
            <section className="lesson-outcome-skills">
              <h2>{success ? "Что теперь\nполучается" : "Что стоит\nповторить"}</h2>
              <ul>
                {(success
                  ? ["Отличать требование от того, что человек защищает", "Называть возможный интерес как гипотезу", "Проверять понимание вопросом «верно ли я понял?»"]
                  : ["Дать контрагенту закончить позицию", "Спросить, что стоит за требованием", "Проверить свою гипотезу вопросом"]
                ).map((item) => <li key={item}>{success ? <CheckCircle /> : <RepeatCircle />}{item}</li>)}
              </ul>
            </section>
            <section className="lesson-outcome-phrase">
              <h2>Ваша фраза урока</h2>
              <div className="report-quote-ticket"><span>{quoteTime ? `Встреча · ${quoteTime}` : "Встреча · ваша реплика"}</span><i aria-hidden="true" /><p>«{quote}»</p></div>
              <small>{analysis.confirmedInterests.length ? confirmedNote : "Вернитесь к этой реплике в полном отчёте\nи проверьте реакцию директора"}</small>
            </section>
          </div>
        </div>

        <aside className="lesson-outcome-right" aria-label="Результат и дальнейшие действия">
          <h2>Навык в карте</h2>
          <div className="lesson-outcome-skill-card">
            <strong>Выявление интересов</strong>
            <span>было {SKILL_MAP_BEFORE} из {SKILL_MAP_SIZE} → стало {mapAfter} из {SKILL_MAP_SIZE}</span>
            <div className="lesson-outcome-dots" aria-label={`${mapAfter} из ${SKILL_MAP_SIZE}`}>
              {Array.from({ length: SKILL_MAP_SIZE }, (_, index) => (
                <i key={index} className={index < SKILL_MAP_BEFORE ? "is-filled" : index < mapAfter ? "is-new" : ""} />
              ))}
            </div>
            <b className="lesson-outcome-gain">+{mapGain}</b>
          </div>
          <div className="lesson-outcome-map-note">
            <p>Урок обновляет подтверждённую карту навыков.<br />Тренировки сохраняются в истории, но карту не меняют.</p>
            <small>Подтверждено по разговору, не по теории</small>
          </div>
          <div className="lesson-outcome-next">
            <span className="report-eyebrow">{success ? "СЛЕДУЮЩИЙ · БЛОК 3 · УРОК 3" : "РЕКОМЕНДАЦИЯ · БЛОК 3 · УРОК 2"}</span>
            <h3>{success ? "Варианты взаимной выгоды" : "Повторить ситуацию"}</h3>
            <p>
              {success ? "Блок 3: пройдено 2 из 4 уроков" : analysis.nextStep}
              {success && <span className="lesson-outcome-block-dots" aria-hidden="true"><i className="is-filled" /><i className="is-filled" /><i /><i /></span>}
            </p>
          </div>
          <div className="lesson-outcome-actions">
            <ReportAction href={reportHref} emphasis>Полный отчёт</ReportAction>
            {success ? (
              <ReportAction primary onClick={() => setNextNotice(true)}>Следующий урок</ReportAction>
            ) : (
              <ReportAction primary href="?screen=brief">Повторить ситуацию</ReportAction>
            )}
            {nextNotice && <p className="lesson-outcome-notice" role="status">Урок 3 ещё не добавлен в эту версию проекта. Вернитесь к полному отчёту или повторите текущий урок.</p>}
          </div>
          <div className="lesson-outcome-footer">
            <a href="?screen=brief">Повторить встречу →</a>
            <small>в карту пойдёт лучший результат</small>
          </div>
        </aside>
      </div>
    </ReportLayout>
  );
}

export function LessonOutcomeScreen() {
  const preview = new URLSearchParams(window.location.search).get("preview") === "reference";
  const reporting = useReportingAttempt(!preview);
  const attempt = preview ? referenceFullReport : reporting.attempt;
  if (!attempt?.analysis) {
    return <ReportState title="Итог урока" attempt={attempt} isAnalyzing={reporting.isAnalyzing} error={reporting.error} onRetry={reporting.retry} />;
  }
  return <LessonOutcomeContent attempt={attempt} preview={preview} />;
}
