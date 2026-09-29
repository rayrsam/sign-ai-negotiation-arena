export type TheoryVerdict = "correct" | "partial" | "incorrect";

export interface TheoryCharacter {
  name: string;
  subtitle: string;
}

export interface TheoryOption {
  letter: "A" | "B" | "C";
  text: string;
  verdict: TheoryVerdict;
}

export interface TheoryQuestion {
  situation: string;
  question: string;
  options: TheoryOption[];
  explanation: string;
}

export interface TheoryLesson {
  id: string;
  lessonTitle: string;
  blockLabel: string;
  character: TheoryCharacter;
  memo: string[];
  questions: TheoryQuestion[];
}

export interface TheoryQuestionResult {
  verdict: TheoryVerdict;
  attempts: 1 | 2;
  answerLetter: "A" | "B" | "C";
}
