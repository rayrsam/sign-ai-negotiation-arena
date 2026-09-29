import { AnswerLetter } from "@/components/answer-letter";
import { ProgressNumber } from "@/components/progress-number";
import { verdictLabel } from "@/data/theory-content";
import { ReportAction } from "@/components/report/report-action";
import { ReportLayout } from "@/components/report/report-layout";
import type { TheoryLesson, TheoryQuestionResult } from "@/types/theory";

interface TheorySummaryProps {
  lesson: TheoryLesson;
  results: TheoryQuestionResult[];
  elapsedSeconds: number;
  onRestart: () => void;
}

function durationLabel(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} секунд`;
  return `${minutes} минут${seconds ? ` ${seconds} секунд` : ""}`;
}

function ScoreDigit({ value }: { value: number }) {
  return value >= 1 && value <= 4
    ? <ProgressNumber number={value} />
    : <span className="theory-score-digit-fallback">{value}</span>;
}

function ResultTile({ index, result }: { index: number; result: TheoryQuestionResult }) {
  const isGood = result.verdict === "correct";
  return (
    <div className={`report-score-tile${isGood ? "" : " is-accent"}`}>
      <span>Ситуация {index + 1}</span>
      <strong><AnswerLetter letter={result.answerLetter} /></strong>
      <div className="report-score-dots" aria-label={`Попытка ${result.attempts} из 2`}>
        {[1, 2].map((dot) => <i key={dot} className={dot <= result.attempts ? "is-filled" : ""} />)}
      </div>
      <small>{verdictLabel[result.verdict].toLowerCase()}</small>
    </div>
  );
}

export function TheorySummary({ lesson, results, elapsedSeconds, onRestart }: TheorySummaryProps) {
  const correctCount = results.filter((result) => result.verdict === "correct").length;

  return (
    <ReportLayout
      title="Итог теории"
      breadcrumb={`Главная / Обучение / ${lesson.blockLabel} / Итог теории`}
      className="theory-summary-page"
    >
      <div className="report-short-grid">
        <div className="report-short-left">
          <section className="report-status-card" aria-label="Итог теории">
            <div className="report-status-heading">
              <div>
                <h2>Теория пройдена</h2>
                <p>{lesson.lessonTitle} · {results.length} ситуации · {durationLabel(elapsedSeconds)}</p>
              </div>
              <div className="report-status-score">
                <strong className="theory-score-value">
                  <ScoreDigit value={correctCount} />
                  <span className="theory-score-slash">/</span>
                  <ScoreDigit value={results.length} />
                </strong>
              </div>
            </div>
            <div className="report-status-bottom">
              <div className="report-score-list theory-result-tiles">
                {results.map((result, index) => (
                  <ResultTile key={index} index={index} result={result} />
                ))}
              </div>
              <div className="report-support">
                <h3>Без баллов</h3>
                <p>Ошибки в теории не переносятся в оценку урока. Навык оценят по разговору с директором.</p>
              </div>
            </div>
          </section>

          <div className="report-short-notes">
            <section className="report-note-card report-improvement">
              <h2>Как вы отвечали</h2>
              <ol className="theory-summary-answers">
                {results.map((result, index) => {
                  const isFirstTryCorrect = result.verdict === "correct" && result.attempts === 1;
                  return (
                    <li key={index} className={isFirstTryCorrect ? "is-first-try" : "is-retry"}>
                      <ProgressNumber number={index + 1} />
                      <div>
                        <strong>{verdictLabel[result.verdict]}</strong>
                        <small>{result.attempts === 2 ? "со второй попытки" : "с первой попытки"}</small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
            <section className="report-note-card report-strength">
              <h2>Комментарий</h2>
              <div className="report-quote-ticket">
                <span>Наставник</span><i aria-hidden="true" />
                <p>Комментарии к ответам появятся здесь, когда добавят содержание урока.</p>
              </div>
            </section>
          </div>
        </div>

        <aside className="report-short-right" aria-label="Что дальше">
          <h2>Что дальше:</h2>
          <section className="report-note-card theory-next-card">
            <h2>Практика</h2>
            <p>Закрепим материал на реальной ситуации.</p>
            <ol>
              {[
                "Реальный кейс для закрепления урока",
                "Бриф: роль, ситуация и задача",
                "Разбор практики",
              ].map((step, index) => (
                <li key={step}>
                  <ProgressNumber number={index + 1} />
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>
          <div className="report-short-actions theory-summary-actions">
            <ReportAction onClick={onRestart}>Повторить урок</ReportAction>
            <ReportAction href="?screen=lessons">Вернуться к урокам</ReportAction>
            <ReportAction primary href={`?screen=brief&id=${lesson.id}`} disabled={lesson.id !== "32"}>
              К практике
            </ReportAction>
          </div>
        </aside>
      </div>
    </ReportLayout>
  );
}
