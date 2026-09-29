import type { HintLevel } from "../types/reporting";
export { inferB3L2Opportunity } from "../../shared/lesson-opportunity";

export interface LessonHintPolicy {
  lessonId: string;
  enabled: boolean;
  voiceCommand: string;
  initialOpportunityId: string;
  levels: Record<HintLevel, string | Record<string, string>>;
}

export const b3L2HintPolicy: LessonHintPolicy = {
  lessonId: "B3-L2",
  enabled: true,
  voiceCommand: "Тренер, дай подсказку",
  initialOpportunityId: "O1",
  levels: {
    1: "Не спорьте с требованием. Подумайте, что человек пытается защитить.",
    2: "Назовите возможный интерес как гипотезу и спросите, верно ли вы поняли.",
    3: {
      O1: "Например: «Правильно понимаю, для вас главное — не перегрузить мастеров и не сорвать запуск?»",
      O2: "Например: «Верно ли, что вам важно сохранить скорость решений на месте?»",
      O3: "Например: «Правильно понимаю, основной риск — что сотрудники воспримут оценку как угрозу?»",
    },
  },
};

const lessonHintPolicies: Record<string, LessonHintPolicy> = {
  [b3L2HintPolicy.lessonId]: b3L2HintPolicy,
};

export function resolveHintPolicy(lessonId: string, sessionKind: "lesson" | "exam" = "lesson"): LessonHintPolicy | null {
  return sessionKind === "exam" ? null : lessonHintPolicies[lessonId] ?? null;
}

export function nextHintLevel(shownCount: number): HintLevel {
  return Math.min(Math.max(shownCount + 1, 1), 3) as HintLevel;
}

export function hintText(policy: LessonHintPolicy, level: HintLevel, opportunityId: string): string {
  const value = policy.levels[level];
  if (typeof value === "string") return value;
  return value[opportunityId] ?? value[policy.initialOpportunityId] ?? Object.values(value)[0] ?? "";
}

export function isVoiceHintCommand(text: string, policy: LessonHintPolicy): boolean {
  const normalize = (value: string) => value
    .toLocaleLowerCase("ru-RU")
    .replaceAll("ё", "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  return normalize(text) === normalize(policy.voiceCommand);
}

