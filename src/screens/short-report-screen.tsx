import { ProgressNumber } from "@/components/progress-number";
import { ReportAction } from "@/components/report/report-action";
import { ReportLayout } from "@/components/report/report-layout";
import { ReportState } from "@/components/report/report-state";
import { ScoreFraction } from "@/components/report/score-fraction";
import { useReportingAttempt } from "@/hooks/use-reporting-attempt";
import type { LessonResultStatus, StoredAttempt } from "@/types/reporting";

type TileTone = "accent" | "soft" | "empty";

interface ScoreTile {
  score: number | null;
  tone: TileTone;
  caption: string;
}

interface ReportActionModel {
  label: string;
  href?: string;
  kind: "default" | "emphasis" | "primary";
}

interface ShortReportModel {
  status: string;
  duration: string;
  scoreText: string;
  score: number | null;
  tiles: ScoreTile[];
  supportTitle: string;
  supportDetail: string;
  targetIcon: "check" | "question";
  targetText: string;
  improvement: string;
  pill: string;
  improvementNote: string;
  ticketLabel: string;
  strength?: string;
  strengthNote: string;
  hintsText: string;
  outcomeTitle: string;
  outcomeNote: string;
  actions: [ReportActionModel, ReportActionModel, ReportActionModel];
}

const opportunityLabels = ["Возможность 1", "Возможность 2", "Возможность 3"];
const outcomeNote = "Исход сделки не влияет на оценку навыка";
const lessonOutcomeHref = "?screen=lesson-outcome&preview=reference";
const fullReportHref = "?screen=full-report&preview=reference";

function captionFor(score: number | null) {
  if (score === null) return "не возникла";
  if (score === 4) return "отлично";
  if (score === 3) return "хорошо";
  return "можно лучше";
}

const variants: Record<LessonResultStatus, ShortReportModel> = {
  independent: {
    status: "Освоено самостоятельно",
    duration: "11 минут 20 секунд",
    scoreText: "3/4",
    score: 3,
    tiles: [
      { score: 3, tone: "accent", caption: "хорошо" },
      { score: 2, tone: "soft", caption: "можно лучше" },
      { score: 4, tone: "accent", caption: "отлично" },
    ],
    supportTitle: "Без подсказок",
    supportDetail: "Наставник не вызывался — попытка засчитана как самостоятельная.",
    targetIcon: "check",
    targetText: "Навык «Перевод позиции в интерес» — 3 из 4",
    improvement: "После ответа директора кратко зафиксируйте подтверждённый интерес.",
    pill: "Возможность 1 · 01:05",
    improvementNote: "Ключевая точка для переигрывания —\nвозможность 2, 04:10",
    ticketLabel: "Возможность 1",
    strength: "Правильно понимаю, для вас главное — не перегрузить мастеров и не сорвать запуск?",
    strengthNote: "Вы назвали риск перегрузки как гипотезу\nи проверили её вопросом",
    hintsText: "не использовались",
    outcomeTitle: "Директор готов обсуждать ограниченный пилот",
    outcomeNote,
    actions: [
      { label: "Полный отчёт", href: fullReportHref, kind: "emphasis" },
      { label: "Переиграть момент", href: "?screen=replay", kind: "default" },
      { label: "Следующий урок", href: lessonOutcomeHref, kind: "primary" },
    ],
  },
  supported: {
    status: "Освоено с поддержкой",
    duration: "11 минут 20 секунд",
    scoreText: "3/4",
    score: 3,
    tiles: [
      { score: 3, tone: "soft", caption: "с подсказкой" },
      { score: 3, tone: "accent", caption: "хорошо" },
      { score: 3, tone: "accent", caption: "хорошо" },
    ],
    supportTitle: "С подсказкой",
    supportDetail: "Использована 1 подсказка, уровень H2. Оценка качества ответа не снижена.",
    targetIcon: "check",
    targetText: "Навык «Перевод позиции в интерес» — 3 из 4",
    improvement: "Попробуйте пройти встречу без подсказок: сначала гипотеза об интересе, затем вопрос.",
    pill: "Возможность 1 · подсказка H2",
    improvementNote: "Подсказка не считается штрафом —\nона отмечает попытку с поддержкой",
    ticketLabel: "Возможность 2",
    strength: "Верно понимаю, для вас важно, чтобы решения на площадке принимались быстро?",
    strengthNote: "Вы проверили интерес вопросом\nуже без подсказки",
    hintsText: "1 · уровень H2",
    outcomeTitle: "Директор готов обсуждать ограниченный пилот",
    outcomeNote,
    actions: [
      { label: "Полный отчёт", href: fullReportHref, kind: "default" },
      { label: "Следующий урок", href: lessonOutcomeHref, kind: "emphasis" },
      { label: "Повторить без подсказок", href: "?screen=brief", kind: "primary" },
    ],
  },
  repeat: {
    status: "Стоит повторить",
    duration: "11 минут 20 секунд",
    scoreText: "1/4",
    score: 1,
    tiles: [
      { score: 1, tone: "soft", caption: "предположение" },
      { score: 1, tone: "soft", caption: "спор с позицией" },
      { score: 2, tone: "soft", caption: "можно лучше" },
    ],
    supportTitle: "Без подсказок",
    supportDetail: "Наставник не вызывался. Навык пока не проявлен уверенно.",
    targetIcon: "question",
    targetText: "Навык «Перевод позиции в интерес» — 1 из 4",
    improvement: "Не выдавайте предположение за факт. Сначала назовите возможный интерес, затем спросите, верно ли вы поняли.",
    pill: "Возможность 1 · 01:05",
    improvementNote: "Ключевая точка для переигрывания —\nвозможность 1, 01:05",
    ticketLabel: "Возможность 3",
    strength: "Что для вас самое сложное в ближайшие десять недель?",
    strengthNote: "Открытый вопрос помог директору\nназвать нагрузку на мастеров",
    hintsText: "не использовались",
    outcomeTitle: "Директор настаивает на отсрочке на полгода",
    outcomeNote,
    actions: [
      { label: "Полный отчёт", href: fullReportHref, kind: "emphasis" },
      { label: "Повторить урок", href: "?screen=brief&id=32", kind: "default" },
      { label: "Переиграть ключевой момент", href: "?screen=replay", kind: "primary" },
    ],
  },
  unassessed: {
    status: "Не удалось оценить навык",
    duration: "3 минуты 05 секунд",
    scoreText: "N/A",
    score: null,
    tiles: [
      { score: 2, tone: "soft", caption: "можно лучше" },
      { score: null, tone: "empty", caption: "не возникла" },
      { score: null, tone: "empty", caption: "не возникла" },
    ],
    supportTitle: "Не выявлено",
    supportDetail: "В разговоре не возникло двух корректных возможностей проверить навык.",
    targetIcon: "question",
    targetText: "Встреча завершена раньше — на 3-й минуте",
    improvement: "Дайте директору договорить и задайте вопрос о том, что стоит за требованием отсрочки.",
    pill: "Возможность 1 · 01:05",
    improvementNote: "Повтор начнёт ситуацию заново —\nс первой реплики директора",
    ticketLabel: "Возможность 1",
    strength: "Почему именно полгода?",
    strengthNote: "Вы не стали спорить с позицией\nи спросили о причине",
    hintsText: "не использовались",
    outcomeTitle: "Встреча завершена досрочно, договорённости нет",
    outcomeNote,
    actions: [
      { label: "Полный отчёт", href: fullReportHref, kind: "emphasis" },
      { label: "К уроку", href: "?screen=brief&id=32", kind: "default" },
      { label: "Повторить ситуацию", href: "?screen=brief&id=32", kind: "primary" },
    ],
  },
};

const statusLabels: Record<LessonResultStatus, string> = {
  independent: "Освоено самостоятельно",
  supported: "Освоено с поддержкой",
  repeat: "Стоит повторить",
  unassessed: "Не удалось оценить навык",
};

function durationLabel(attempt: StoredAttempt) {
  if (!attempt.endedAt) return "";
  const seconds = Math.max(0, Math.round((Date.parse(attempt.endedAt) - Date.parse(attempt.startedAt)) / 1000));
  return `${Math.floor(seconds / 60)} мин ${seconds % 60} сек`;
}

function elapsedLabel(attempt: StoredAttempt, turnId?: string) {
  const turn = attempt.transcript.find((item) => item.id === turnId);
  if (!turn?.createdAt) return "";
  const seconds = Math.max(0, Math.round((Date.parse(turn.createdAt) - Date.parse(attempt.startedAt)) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function liveModel(attempt: StoredAttempt): ShortReportModel {
  const analysis = attempt.analysis!;
  const isUnassessed = analysis.status === "unassessed";
  const evaluated = analysis.opportunities.filter((item) => item.score !== null);
  const strongest = [...evaluated].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  const weakest = [...evaluated].sort((a, b) => (a.score || 0) - (b.score || 0))[0];
  const maxHint = attempt.hints.reduce((max, hint) => Math.max(max, hint.level), 0);
  const attemptQuery = `&attempt=${encodeURIComponent(attempt.id)}`;
  const replayHref = analysis.keyMomentTurnId
    ? `?screen=replay${attemptQuery}&turn=${encodeURIComponent(analysis.keyMomentTurnId)}`
    : undefined;
  const scoreText = analysis.score === null ? "N/A" : `${analysis.score}/4`;
  const hintedOpportunities = new Set(attempt.hints.map((hint) => hint.opportunityId).filter(Boolean));
  const tiles = [0, 1, 2].map((index): ScoreTile => {
    const item = analysis.opportunities[index];
    const score = item?.score ?? null;
    if (score === null) return { score, tone: "empty", caption: captionFor(score) };
    if (item && hintedOpportunities.has(item.opportunityId)) return { score, tone: "soft", caption: "с подсказкой" };
    return { score, tone: score >= 3 ? "accent" : "soft", caption: captionFor(score) };
  });
  const keyMoment = analysis.keyMomentTurnId ? elapsedLabel(attempt, analysis.keyMomentTurnId) : "";

  return {
    status: statusLabels[analysis.status],
    duration: durationLabel(attempt),
    scoreText,
    score: analysis.score,
    tiles,
    supportTitle: isUnassessed ? "Не выявлено" : attempt.hints.length ? "С подсказкой" : "Без подсказок",
    supportDetail: attempt.hints.length
      ? `Использовано подсказок: ${attempt.hints.length}, уровень H${maxHint}. Оценка качества ответа не снижена.`
      : isUnassessed
        ? "В разговоре не возникло двух корректных возможностей проверить навык."
        : "Наставник не вызывался — попытка засчитана как самостоятельная.",
    targetIcon: analysis.score !== null && analysis.score >= 3 ? "check" : "question",
    targetText: `Навык «Перевод позиции в интерес» — ${analysis.score === null ? "N/A" : `${analysis.score} из 4`}`,
    improvement: weakest?.improvement || analysis.nextStep || "Повторите ситуацию, чтобы создать больше возможностей проявить навык.",
    pill: weakest ? `${weakest.opportunityId.replace(/^O/, "Возможность ")} · ${elapsedLabel(attempt, weakest.responseTurnId) || "ваша реплика"}` : "Ваша реплика",
    improvementNote: keyMoment ? `Ключевая точка для переигрывания —\n${keyMoment}` : "Ключевой момент можно переиграть\nс исходной позиции директора",
    ticketLabel: strongest ? strongest.opportunityId.replace(/^O/, "Возможность ") : "Реплика",
    strength: strongest?.responseText,
    strengthNote: strongest?.fact || (isUnassessed ? "Недостаточно валидных возможностей для итоговой оценки." : "Выводы отчёта привязаны к репликам встречи."),
    hintsText: attempt.hints.length ? `${attempt.hints.length} · уровень H${maxHint}` : "не использовались",
    outcomeTitle: analysis.outcomeTitle,
    outcomeNote,
    actions: [
      { label: "Полный отчёт", href: `?screen=full-report${attemptQuery}`, kind: "emphasis" },
      replayHref
        ? { label: "Переиграть момент", href: replayHref, kind: "default" }
        : { label: "Ключевой момент не определён", kind: "default" },
      analysis.status === "independent"
        ? { label: "Следующий урок", href: `?screen=lesson-outcome${attemptQuery}`, kind: "primary" }
        : { label: "Повторить ситуацию", href: "?screen=brief", kind: "primary" },
    ],
  };
}

function OpportunityScore({ label, tile }: { label: string; tile: ScoreTile }) {
  const { score } = tile;
  return (
    <div className={`report-score-tile is-${tile.tone}`}>
      <span>{label}</span>
      <strong>{score !== null && score >= 1 && score <= 4 ? <ProgressNumber number={score} /> : null}</strong>
      {score !== null && (
        <div className="report-score-dots" aria-label={`${score} из 4`}>
          {[1, 2, 3, 4].map((dot) => <i key={dot} className={dot <= score ? "is-filled" : ""} />)}
        </div>
      )}
      <small>{tile.caption}</small>
    </div>
  );
}

function TargetIcon({ kind }: { kind: "check" | "question" }) {
  return (
    <svg className={`report-target-icon${kind === "question" ? " is-question" : ""}`} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      {kind === "check" ? (
        <>
          <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="2" />
          <path d="M8.1 14.5 12 18.5 20.3 9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <circle cx="14" cy="14" r="13" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2.4" />
          <path d="M10.6 11.2a3.5 3.5 0 1 1 5 3.1c-1 .5-1.6 1.3-1.6 2.4v.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="14" cy="20.6" r="1.2" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

function ShortReportView({ model }: { model: ShortReportModel }) {
  const isUnassessed = model.score === null;
  const scoreTone = model.score === null ? "" : model.score >= 3 ? " is-accent" : " is-soft";

  return (
    <ReportLayout title="Краткий отчёт" location="Краткий отчёт" className="short-report-page">
      <div className="report-short-grid">
        <div className="report-short-left">
          <section className="report-status-card" aria-label="Итог урока">
            <div className="report-status-heading">
              <div>
                <h2>{model.status}</h2>
                <p>Позиции и интересы · встреча с директором завода · {model.duration}</p>
              </div>
              <div className={`report-status-score${isUnassessed ? " is-unassessed" : ""}`}>
                <strong><ScoreFraction text={model.scoreText} /></strong>
                <small>навык</small>
              </div>
            </div>
            <div className="report-status-bottom">
              <div className="report-score-list">
                {model.tiles.map((tile, index) => <OpportunityScore key={opportunityLabels[index]} label={opportunityLabels[index]} tile={tile} />)}
              </div>
              <div className="report-support">
                <h3>{model.supportTitle}</h3>
                <p>{model.supportDetail}</p>
                <div className="report-target-label"><TargetIcon kind={model.targetIcon} />{model.targetText}</div>
              </div>
            </div>
          </section>
          <div className="report-short-notes">
            <section className="report-note-card report-improvement">
              <h2>Что улучшить</h2>
              <p>{model.improvement}</p>
              <span className="report-evidence-pill"><i />{model.pill}</span>
              <small>{model.improvementNote}</small>
            </section>
            <section className="report-note-card report-strength">
              <h2>Что получилось</h2>
              {model.strength ? (
                <div className="report-quote-ticket">
                  <span>{model.ticketLabel} <b>· ваша реплика</b></span>
                  <i aria-hidden="true" />
                  <p>«{model.strength}»</p>
                </div>
              ) : <p>Пока недостаточно подтверждённых данных для выделения сильной реплики.</p>}
              <small>{model.strengthNote}</small>
            </section>
          </div>
        </div>
        <aside className="report-short-right" aria-label="Навык и действия">
          <h2>Навык урока</h2>
          <div className="report-metric">
            <span>Выявление интересов</span>
            {isUnassessed
              ? <small className="report-metric-na">N/A</small>
              : (
                <div className={`report-metric-dots${scoreTone}`} aria-label={model.scoreText}>
                  {[1, 2, 3, 4].map((dot) => <i key={dot} className={model.score !== null && dot <= model.score ? "is-filled" : ""} />)}
                </div>
              )}
          </div>
          <div className="report-metric"><span>Подсказки наставника</span><small>{model.hintsText}</small></div>
          <div className="report-outcome"><span>ИСХОД ВСТРЕЧИ</span><p>{model.outcomeTitle}</p><small>{model.outcomeNote}</small></div>
          <div className="report-short-actions">
            {model.actions.slice(0, 2).map((action) => (
              <ReportAction key={action.label} href={action.href} emphasis={action.kind === "emphasis"}>{action.label}</ReportAction>
            ))}
            <div className="report-action-gap" />
            <ReportAction primary href={model.actions[2].href}>{model.actions[2].label}</ReportAction>
          </div>
        </aside>
      </div>
    </ReportLayout>
  );
}

export function ShortReportScreen() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("variant");
  const previewVariant = Boolean(requested && requested in variants && !params.has("attempt"));
  const reporting = useReportingAttempt(!previewVariant);
  if (reporting.attempt) {
    if (!reporting.attempt.analysis) {
      return <ReportState title="Краткий отчёт" attempt={reporting.attempt} isAnalyzing={reporting.isAnalyzing} error={reporting.error} onRetry={reporting.retry} />;
    }
    return <ShortReportView model={liveModel(reporting.attempt)} />;
  }
  if (!previewVariant) {
    return <ReportState title="Краткий отчёт" attempt={null} isAnalyzing={false} error={null} onRetry={() => {}} />;
  }
  return <ShortReportView model={variants[requested as LessonResultStatus]} />;
}
