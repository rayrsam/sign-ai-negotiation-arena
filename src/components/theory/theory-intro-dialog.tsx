import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { AnswerLetter } from "@/components/answer-letter";
import { ProgressNumber } from "@/components/progress-number";
import { Button } from "@/components/ui/button";

interface TheoryIntroDialogProps {
  open: boolean;
  locked: boolean;
  onStart: () => void;
  onBack: () => void;
}

const steps = [
  { title: "Прочитайте ситуацию", description: "реплику директора и вопрос к ней" },
  { title: "Выберите карту A, B или C", description: "и нажмите «Сыграть карту» — выбор можно менять до этого" },
  { title: "Посмотрите объяснение", description: "после неверного ответа можно выбрать снова" },
];

export function TheoryIntroDialog({ open, locked, onStart, onBack }: TheoryIntroDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>(locked ? ".dialog-secondary" : ".dialog-primary")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, locked]);

  return (
    <dialog
      ref={dialogRef}
      className="session-dialog intro-dialog"
      aria-labelledby="theory-dialog-title"
      aria-describedby="theory-dialog-description"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="practice-intro-layout">
        <div className="practice-intro-copy">
          <h2 id="theory-dialog-title">Как устроена теория</h2>
          <ol className="practice-steps">
            {steps.map((step, index) => (
              <li key={step.title}>
                <ProgressNumber number={index + 1} />
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </div>
              </li>
            ))}
          </ol>
          <p id="theory-dialog-description" className="practice-dialog-description">
            Правильная карта заранее не выделяется. Ошибки в теории не влияют
            на оценку урока — баллов здесь нет.
          </p>
          <div className="session-dialog-actions">
            <Button type="button" className="dialog-primary" disabled={locked} onClick={onStart}>
              {locked ? "Появится в полной версии" : (<>Начать урок<ArrowRight aria-hidden="true" /></>)}
            </Button>
            <Button type="button" variant="outline" className="dialog-secondary" onClick={onBack}>
              Вернуться к урокам
            </Button>
          </div>
        </div>
        <div className="theory-intro-preview" aria-hidden="true">
          <div className="theory-cards theory-intro-cards">
            <div className="theory-card theory-card-0">
              <span className="theory-card-letter"><AnswerLetter letter="A" /></span>
            </div>
            <div className="theory-card theory-card-1 is-active">
              <span className="theory-card-letter"><AnswerLetter letter="B" /></span>
              <span className="theory-card-divider" />
            </div>
            <div className="theory-card theory-card-2">
              <span className="theory-card-letter"><AnswerLetter letter="C" /></span>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
