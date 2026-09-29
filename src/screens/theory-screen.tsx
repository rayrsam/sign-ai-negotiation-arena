import { ArrowRight } from "lucide-react";
import { ArenaHeader } from "@/components/arena-header";
import { Button } from "@/components/ui/button";
import { TheoryAnswerCards } from "@/components/theory/theory-answer-cards";
import { TheoryCharacterCard } from "@/components/theory/theory-character-card";
import { TheoryIntroDialog } from "@/components/theory/theory-intro-dialog";
import { TheoryMeters } from "@/components/theory/theory-meters";
import { TheoryPromptPanel } from "@/components/theory/theory-prompt-panel";
import { TheorySummary } from "@/components/theory/theory-summary";
import { useTheorySession } from "@/hooks/use-theory-session";

const LETTERS = ["A", "B", "C"] as const;

export function TheoryScreen() {
  const id = new URLSearchParams(window.location.search).get("id") || "00";
  const session = useTheorySession(id);
  const { lesson } = session;

  if (session.phase === "summary") {
    return (
      <TheorySummary
        lesson={lesson}
        results={session.results}
        elapsedSeconds={session.elapsedSeconds}
        onRestart={session.restart}
      />
    );
  }

  const answered = session.committedIndex !== null;

  return (
    <main className="arena-shell theory-screen">
      <ArenaHeader
        activeStep={1}
        title={`Теория · ${lesson.lessonTitle}`}
        subtitle={`${lesson.blockLabel} · ${session.totalQuestions} ситуации с выбором ответа`}
        actions={(
          <>
            <span className="theory-timer"><i aria-hidden="true" />{session.elapsedTime}</span>
            <Button type="button" variant="outline" className="theory-finish-action" onClick={session.backToLessons}>
              Завершить
            </Button>
          </>
        )}
      />

      <section className="theory-layout">
        <TheoryCharacterCard
          character={lesson.character}
          mood={session.mood}
          moodMax={session.meterMax}
          memo={lesson.memo}
        />

        <div className="theory-main">
          <TheoryPromptPanel
            questionIndex={session.questionIndex}
            totalQuestions={session.totalQuestions}
            characterName={lesson.character.name}
            situation={session.question.situation}
            question={session.question.question}
            verdict={session.committedVerdict}
            explanation={session.committedVerdict ? session.question.explanation : ""}
          />
          <TheoryAnswerCards
            options={session.question.options}
            selectedIndex={session.selectedIndex}
            committedIndex={session.committedIndex}
            answered={answered}
            onSelect={session.selectCard}
          />
        </div>

        <div className="theory-side-right">
          <TheoryMeters trust={session.trust} tension={session.tension} max={session.meterMax} />

          {!answered ? (
            <Button
              type="button"
              className="theory-play-action"
              disabled={session.selectedIndex === null}
              onClick={session.playCard}
            >
              {session.selectedIndex === null ? "Выберите карту" : `Сыграть карту ${LETTERS[session.selectedIndex]}`}
            </Button>
          ) : session.canRetry ? (
            <Button type="button" variant="outline" className="theory-retry-action" onClick={session.retry}>
              Выбрать снова
            </Button>
          ) : (
            <Button type="button" className="theory-next-action" onClick={session.advance}>
              {session.isLastQuestion ? "К итогам" : "Дальше"}
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </div>
      </section>

      <TheoryIntroDialog
        open={session.phase === "intro"}
        locked={id !== "32" && id !== "00"}
        onStart={session.startQuiz}
        onBack={session.backToLessons}
      />
    </main>
  );
}
