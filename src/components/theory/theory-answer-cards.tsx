import { verdictLabel } from "@/data/theory-content";
import { cn } from "@/lib/utils";
import type { TheoryOption } from "@/types/theory";

interface TheoryAnswerCardsProps {
  options: TheoryOption[];
  selectedIndex: number | null;
  committedIndex: number | null;
  answered: boolean;
  onSelect: (index: number) => void;
}

export function TheoryAnswerCards({ options, selectedIndex, committedIndex, answered, onSelect }: TheoryAnswerCardsProps) {
  return (
    <div className="theory-cards">
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        const isCommitted = committedIndex === index;
        const badge = isCommitted ? "ваш ответ" : isSelected ? "выбран" : "вариант";

        return (
          <button
            key={option.letter}
            type="button"
            className={cn(
              "theory-card",
              `theory-card-${index}`,
              (isSelected || isCommitted) && "is-active",
            )}
            onClick={() => onSelect(index)}
            disabled={answered}
            aria-pressed={isSelected || isCommitted}
          >
            <span className="theory-card-letter">{option.letter}</span>
            <span className="theory-card-heading">
              <strong>Вариант</strong>
              <small>{badge}</small>
            </span>
            <span className="theory-card-divider" aria-hidden="true" />
            <span className="theory-card-text">{option.text}</span>
            {isCommitted && (
              <span className="theory-card-verdict">{verdictLabel[option.verdict]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
