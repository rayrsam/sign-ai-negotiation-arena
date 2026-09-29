export type LessonProgressStatus = "locked" | "available" | "current" | "done";

// Simulates a future `user_lesson_progress` table row per lesson id (blockId + lesson number,
// e.g. block 2 lesson 3 -> "23"). Swap this module for a fetch/query against the real table later.
export const lessonProgress: Record<string, LessonProgressStatus> = {
  "11": "available",
  "12": "locked",
  "13": "locked",
  "14": "locked",

  "21": "available",
  "22": "locked",
  "23": "locked",
  "24": "locked",

  "31": "done",
  "32": "current",
  "33": "locked",
  "34": "locked",

  "41": "available",
  "42": "locked",
  "43": "locked",
  "44": "locked",
};

export function lessonStatus(id: string): LessonProgressStatus {
  return lessonProgress[id] ?? "locked";
}

export function totalLessonsCount(): number {
  return Object.keys(lessonProgress).length;
}

export function completedLessonsCount(): number {
  return Object.values(lessonProgress).filter((status) => status === "done").length;
}
