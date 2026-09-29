import { LoaderCircle, RotateCcw } from "lucide-react";
import { ReportAction } from "@/components/report/report-action";
import { ReportLayout } from "@/components/report/report-layout";
import type { StoredAttempt } from "@/types/reporting";

interface ReportStateProps {
  title: string;
  attempt: StoredAttempt | null;
  isAnalyzing: boolean;
  error: string | null;
  onRetry: () => void;
}

export function ReportState({ title, attempt, isAnalyzing, error, onRetry }: ReportStateProps) {
  const heading = !attempt
    ? "Завершённая встреча не найдена"
    : isAnalyzing
      ? "Готовим разбор встречи"
      : "Отчёт пока не готов";

  return (
    <ReportLayout title={title} location={title} className="report-state-page">
      <section className="report-state-card" aria-live="polite">
        {isAnalyzing && <LoaderCircle className="report-state-spinner" aria-hidden="true" size={30} />}
        {!isAnalyzing && error && <RotateCcw aria-hidden="true" size={28} />}
        <h2>{heading}</h2>
        <p>
          {!attempt
            ? "Завершите встречу, чтобы сохранить её транскрипт и сформировать отчёт по уроку."
            : isAnalyzing
              ? "Оцениваем только наблюдаемые действия и привязываем выводы к репликам."
              : error || "Для этой попытки ещё нет результата анализа."}
        </p>
        {attempt && !isAnalyzing && (
          <ReportAction onClick={onRetry} primary>Повторить анализ</ReportAction>
        )}
        {!attempt && <ReportAction href="?screen=meeting">Перейти к встрече</ReportAction>}
      </section>
    </ReportLayout>
  );
}
