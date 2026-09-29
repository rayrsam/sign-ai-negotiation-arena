import { ArenaHeader } from "@/components/arena-header";
import { ReportAction } from "@/components/report/report-action";
import { getAttempt, getAttemptPrefix } from "@/services/attempt-storage";
import type { StoredAttempt } from "@/types/reporting";

interface ReplayTurn {
  id: string;
  time: string;
  role: "assistant" | "user";
  content: string;
}

interface ReplayModel {
  history: ReplayTurn[];
  keyTurnId: string;
  replacedTurn?: ReplayTurn;
  droppedCount: number;
  eyebrow: string;
  keyTime: string;
  keyText: string;
  originalAnswer?: string;
  guidance: string;
  comparison: { answer: string; reaction: string; meaning: string };
  replayHref?: string;
  reportHref: string;
  exitHref: string;
}

function replayTime(attempt: StoredAttempt, turnId: string) {
  const turn = attempt.transcript.find((item) => item.id === turnId);
  if (!turn?.createdAt) return "--:--";
  const elapsed = Math.max(0, Math.round((Date.parse(turn.createdAt) - Date.parse(attempt.startedAt)) / 1000));
  return `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
}

function pluralReplies(count: number) {
  const rest10 = count % 10;
  const rest100 = count % 100;
  if (rest10 === 1 && rest100 !== 11) return "реплика";
  if (rest10 >= 2 && rest10 <= 4 && (rest100 < 12 || rest100 > 14)) return "реплики";
  return "реплик";
}

const referenceModel: ReplayModel = {
  history: [
    { id: "t1", time: "00:00", role: "assistant", content: "Я сразу обозначу позицию: новые кадровые процедуры нам сейчас не нужны…" },
    { id: "t2", time: "01:05", role: "user", content: "Правильно понимаю, главное — не перегрузить мастеров?" },
    { id: "t3", time: "01:20", role: "assistant", content: "Да. Сейчас любой новый отчёт или встреча забирает людей у запуска." },
    { id: "t4", time: "04:10", role: "assistant", content: "Наши решения работают быстрее корпоративных процедур." },
  ],
  keyTurnId: "t4",
  replacedTurn: { id: "t5", time: "04:25", role: "user", content: "Но стандарты всё равно нужно внедрить." },
  droppedCount: 9,
  eyebrow: "КЛЮЧЕВАЯ ТОЧКА · ВОЗМОЖНОСТЬ 2",
  keyTime: "04:10",
  keyText: "Наши решения работают быстрее корпоративных процедур",
  originalAnswer: "Но стандарты всё равно нужно внедрить",
  guidance: "Назовите возможный интерес и проверьте его вопросом.",
  comparison: {
    answer: "«Но стандарты всё равно нужно внедрить»",
    reaction: "повторил требование",
    meaning: "интерес не прояснился",
  },
  reportHref: "?screen=report&variant=independent",
  exitHref: "?screen=report&variant=independent",
};

function storedModel(attempt: StoredAttempt, turnId: string): ReplayModel | null {
  const prefix = getAttemptPrefix(attempt, turnId);
  const keyTurn = prefix.at(-1);
  if (!keyTurn) return null;
  const keyIndex = attempt.transcript.findIndex((turn) => turn.id === turnId);
  const next = attempt.transcript[keyIndex + 1];
  const opportunity = attempt.analysis?.opportunities.find((item) => item.positionTurnId === turnId);
  const reportHref = `?screen=report&attempt=${encodeURIComponent(attempt.id)}`;
  const toTurn = (turn: StoredAttempt["transcript"][number]): ReplayTurn => ({
    id: turn.id,
    time: replayTime(attempt, turn.id),
    role: turn.role,
    content: turn.content,
  });
  const replaced = next?.role === "user" ? toTurn(next) : undefined;
  const answer = opportunity?.responseText || replaced?.content;

  return {
    history: prefix.map(toTurn),
    keyTurnId: keyTurn.id,
    replacedTurn: replaced,
    droppedCount: Math.max(0, attempt.transcript.length - keyIndex - 1 - (replaced ? 1 : 0)),
    eyebrow: `КЛЮЧЕВАЯ ТОЧКА · ${opportunity ? `ВОЗМОЖНОСТЬ ${opportunity.opportunityId.replace(/^O/, "")}` : "РАЗБОР"}`,
    keyTime: replayTime(attempt, keyTurn.id),
    keyText: keyTurn.content.replace(/[.\s]+$/, ""),
    originalAnswer: answer?.replace(/[.\s]+$/, ""),
    guidance: opportunity?.improvement || attempt.analysis?.improvedWording || "Назовите возможный интерес как гипотезу и проверьте его вопросом.",
    comparison: {
      answer: answer ? `«${answer.replace(/[.\s]+$/, "")}»` : "ответ не зафиксирован",
      reaction: opportunity?.effect || "реакция не зафиксирована",
      meaning: opportunity?.interestConfirmed && opportunity.interestHypothesis ? opportunity.interestHypothesis : "интерес не прояснился",
    },
    replayHref: `?screen=meeting&replayAttempt=${encodeURIComponent(attempt.id)}&turn=${encodeURIComponent(turnId)}`,
    reportHref,
    exitHref: reportHref,
  };
}

function ReplayView({ model }: { model: ReplayModel }) {
  return (
    <div className="report-stage">
    <main className="replay-page">
      <ArenaHeader activeStep={4} actions={<a className="lesson-exit" href={model.exitHref}>Выйти из урока</a>} />
      <div className="replay-grid">
        <aside className="replay-history">
          <h2>Ход встречи</h2><p>Реплики до ключевой точки</p>
          <div className="replay-history-list">
            {model.history.map((turn) => (
              <div className={`${turn.role === "user" ? "is-user" : ""}${turn.id === model.keyTurnId ? " is-key" : ""}`} key={turn.id}>
                <span>{turn.time} · {turn.role === "assistant" ? "Директор" : "Вы"}</span>
                <p>{turn.content}</p>
                {turn.id === model.keyTurnId && <b>ключевая точка</b>}
              </div>
            ))}
            {model.replacedTurn && (
              <div className="is-future">
                <span>{model.replacedTurn.time} · Вы</span>
                <em>будет заменён новым ответом</em>
                <p>{model.replacedTurn.content}</p>
              </div>
            )}
          </div>
          {model.droppedCount > 0 && (
            <small className="replay-history-note">
              Ещё {model.droppedCount} {pluralReplies(model.droppedCount)} после этой точки в новую ветку не попадут. Исходная попытка останется в отчёте.
            </small>
          )}
        </aside>
        <div className="replay-content">
          <span className="report-eyebrow">{model.eyebrow}</span>
          <h1>Переиграть ключевой момент</h1>
          <div className="replay-quote">
            <span>{model.keyTime} · директор</span><i aria-hidden="true" />
            <p>«{model.keyText}»</p>
            {model.originalAnswer && <p className="replay-original-answer">Вы ответили: «{model.originalAnswer}»</p>}
          </div>
          <div className="replay-guidance"><strong>Что попробовать</strong><p>{model.guidance}</p></div>
          <ul className="replay-explanation">
            <li>Разговор до {model.keyTime} сохранится — директор повторит свою реплику.</li>
            <li>Готовый ответ не показываем. Подсказка — только по запросу, как в практике.</li>
            <li>После новой ветви сравним реплику, реакцию директора и подтверждённый смысл, а не только балл.</li>
          </ul>
          <section className="replay-comparison">
            <h2>Сравним после новой ветки</h2>
            <div>
              <span>Ваша реплика<strong>{model.comparison.answer}</strong></span>
              <span>Реакция директора<strong>{model.comparison.reaction}</strong></span>
              <span>Подтверждённый смысл<strong>{model.comparison.meaning}</strong></span>
            </div>
          </section>
          <div className="replay-actions">
            {model.replayHref
              ? <ReportAction href={model.replayHref} primary>Переиграть отсюда</ReportAction>
              : <ReportAction primary>Переиграть отсюда</ReportAction>}
            <ReportAction href={model.reportHref}>К отчёту</ReportAction>
          </div>
        </div>
      </div>
    </main>
    </div>
  );
}

export function ReplayScreen() {
  const params = new URLSearchParams(window.location.search);
  const attemptId = params.get("attempt");
  const turnId = params.get("turn");
  const attempt = attemptId ? getAttempt(attemptId) : null;

  if (attempt && turnId) {
    const model = storedModel(attempt, turnId);
    if (!model) {
      return (
        <div className="report-stage">
          <main className="replay-page">
            <p>Ключевая точка этой попытки не найдена.</p>
            <ReportAction href={`?screen=report&attempt=${encodeURIComponent(attempt.id)}`}>К отчёту</ReportAction>
          </main>
        </div>
      );
    }
    return <ReplayView model={model} />;
  }

  return <ReplayView model={referenceModel} />;
}
