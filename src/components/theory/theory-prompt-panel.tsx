import { Check, CircleAlert, X } from "lucide-react";
import { verdictBannerLabel } from "@/data/theory-content";
import type { TheoryVerdict } from "@/types/theory";

interface TheoryPromptPanelProps {
  questionIndex: number;
  totalQuestions: number;
  characterName: string;
  situation: string;
  question: string;
  verdict: TheoryVerdict | null;
  explanation: string;
}

const verdictIcon: Record<TheoryVerdict, typeof Check> = {
  correct: Check,
  partial: CircleAlert,
  incorrect: X,
};

export function TheoryPromptPanel({
  questionIndex, totalQuestions, characterName, situation, question, verdict, explanation,
}: TheoryPromptPanelProps) {
  if (verdict) {
    const Icon = verdictIcon[verdict];
    return (
      <article className="theory-prompt-panel is-feedback">
        <span className="theory-prompt-kicker">
          <Icon size={16} aria-hidden="true" />
          {verdictBannerLabel[verdict]}
        </span>
        <p className="theory-prompt-explanation">{explanation}</p>
      </article>
    );
  }

  return (
    <article className="theory-prompt-panel">
      <div className="theory-prompt-heading">
        <span className="theory-prompt-kicker">Ситуация {questionIndex + 1} из {totalQuestions}</span>
        <span className="theory-prompt-meta">{characterName} · выберите карту-ответ</span>
      </div>
      {situation && <p className="theory-prompt-situation">{situation}</p>}
      <p className="theory-prompt-question">Вопрос: {question}</p>
    </article>
  );
}
