import { useEffect, useMemo, useRef, useState } from "react";
import { getTheoryLesson } from "@/data/theory-content";
import type { TheoryQuestionResult, TheoryVerdict } from "@/types/theory";

const METER_MAX = 10;

const VERDICT_DELTA: Record<TheoryVerdict, { trust: number; tension: number; mood: number }> = {
  correct: { trust: 2, tension: -1, mood: 1 },
  partial: { trust: 0, tension: 1, mood: 0 },
  incorrect: { trust: -1, tension: 2, mood: -1 },
};

function clamp(value: number) {
  return Math.max(0, Math.min(METER_MAX, value));
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function useTheorySession(lessonId: string) {
  const lesson = useMemo(() => getTheoryLesson(lessonId), [lessonId]);
  const totalQuestions = lesson.questions.length;

  const [phase, setPhase] = useState<"intro" | "quiz" | "summary">("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [committedIndex, setCommittedIndex] = useState<number | null>(null);
  const [attempt, setAttempt] = useState<1 | 2>(1);
  const [trust, setTrust] = useState(3);
  const [tension, setTension] = useState(2);
  const [mood, setMood] = useState(3);
  const [results, setResults] = useState<TheoryQuestionResult[]>([]);
  const [seconds, setSeconds] = useState(0);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "quiz") return;
    timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [phase]);

  const question = lesson.questions[questionIndex];
  const answered = committedIndex !== null;
  const committedOption = answered ? question.options[committedIndex] : null;
  const committedVerdict = committedOption?.verdict ?? null;
  const canRetry = answered && committedVerdict !== "correct" && attempt === 1;
  const canAdvance = answered && !canRetry;

  function startQuiz() {
    setPhase("quiz");
  }

  function backToLessons() {
    window.location.search = "?screen=lessons";
  }

  function selectCard(index: number) {
    if (answered) return;
    setSelectedIndex(index);
  }

  function playCard() {
    if (selectedIndex === null || answered) return;
    setCommittedIndex(selectedIndex);
  }

  function retry() {
    if (!canRetry) return;
    setAttempt(2);
    setCommittedIndex(null);
    setSelectedIndex(null);
  }

  function advance() {
    if (!canAdvance || committedIndex === null || committedVerdict === null) return;

    const delta = VERDICT_DELTA[committedVerdict];
    setTrust((value) => clamp(value + delta.trust));
    setTension((value) => clamp(value + delta.tension));
    setMood((value) => clamp(value + delta.mood));
    setResults((current) => [
      ...current,
      { verdict: committedVerdict, attempts: attempt, answerLetter: question.options[committedIndex].letter },
    ]);

    if (questionIndex + 1 >= totalQuestions) {
      setPhase("summary");
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      return;
    }

    setQuestionIndex((value) => value + 1);
    setSelectedIndex(null);
    setCommittedIndex(null);
    setAttempt(1);
  }

  function restart() {
    setPhase("intro");
    setQuestionIndex(0);
    setSelectedIndex(null);
    setCommittedIndex(null);
    setAttempt(1);
    setTrust(3);
    setTension(2);
    setMood(3);
    setResults([]);
    setSeconds(0);
  }

  return {
    lesson,
    phase,
    questionIndex,
    totalQuestions,
    question,
    selectedIndex,
    committedIndex,
    committedVerdict,
    attempt,
    trust,
    tension,
    mood,
    meterMax: METER_MAX,
    results,
    elapsedSeconds: seconds,
    elapsedTime: formatTime(seconds),
    canRetry,
    canAdvance,
    isLastQuestion: questionIndex + 1 >= totalQuestions,
    startQuiz,
    backToLessons,
    selectCard,
    playCard,
    retry,
    advance,
    restart,
  };
}
