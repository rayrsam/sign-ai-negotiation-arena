import type { StoredAttempt } from "@/types/reporting";

const startedAt = "2026-09-27T09:00:00.000Z";
const startedMs = Date.parse(startedAt);

function turn(id: string, role: "assistant" | "user", content: string, elapsedSeconds: number) {
  return {
    id,
    role,
    content,
    createdAt: new Date(startedMs + elapsedSeconds * 1000).toISOString(),
  } as const;
}

const position1 = "Вернёмся к изменениям через полгода";
const response1 = "Правильно понимаю, главное — не перегрузить мастеров?";
const position2 = "Наши решения работают быстрее корпоративных процедур";
const response2 = "Но стандарты всё равно нужно внедрить";
const position3 = "Пилот — это всё равно нагрузка на людей";
const response3 = "Верно понимаю: пилот возможен, если ограничим нагрузку и оставим решения на площадке?";

export const referenceFullReport: StoredAttempt = {
  schemaVersion: 1,
  id: "reference-full-report-preview",
  lessonId: "B3-L2",
  scenarioId: "SC-B3-L2-PLANT-PILOT",
  scenarioVersion: "1.0",
  rubricVersion: "B3-L2-rubric-1.0",
  startedAt,
  endedAt: new Date(startedMs + 680_000).toISOString(),
  finishReason: "manual",
  transcript: [
    turn("opening", "assistant", "Новые кадровые процедуры нам сейчас не нужны: мастера перегружены, вернёмся к изменениям через полгода.", 0),
    turn("position-o1", "assistant", position1, 65),
    turn("response-o1", "user", response1, 72),
    turn("reaction-o1", "assistant", "Да. До запуска линии важно не отвлекать мастеров от подготовки.", 80),
    turn("position-o2", "assistant", position2, 250),
    turn("response-o2", "user", response2, 258),
    turn("reaction-o2", "assistant", "Скорость решений на площадке сейчас действительно важна.", 270),
    turn("position-o3", "assistant", position3, 510),
    turn("response-o3", "user", response3, 520),
    turn("reaction-o3", "assistant", "Да, если пилот будет ограничен одним подразделением и решения останутся на площадке.", 530),
    turn("outcome-conditions", "assistant", "Я готов обсуждать ограниченный пилот в одном подразделении, если мы ограничим нагрузку на мастеров, оставим оперативные решения на площадке и заранее объясним цель сотрудникам.", 645),
  ],
  events: [],
  hints: [],
  analysis: {
    status: "independent",
    score: 3,
    validOpportunityCount: 3,
    opportunities: [
      {
        opportunityId: "O1",
        positionTurnId: "position-o1",
        responseTurnId: "response-o1",
        reactionTurnId: "reaction-o1",
        positionText: position1,
        responseText: response1,
        score: 3,
        confidence: 0.94,
        fact: "Гипотеза об интересе сформулирована нейтрально и проверена вопросом.",
        effect: "Директор подтвердил риск нагрузки и объяснил связь со сроком запуска.",
        improvement: "После подтверждения резюмируйте интерес, чтобы зафиксировать общее понимание.",
        interestHypothesis: "Не перегружать мастеров до запуска линии",
        interestConfirmed: true,
      },
      {
        opportunityId: "O2",
        positionTurnId: "position-o2",
        responseTurnId: "response-o2",
        reactionTurnId: "reaction-o2",
        positionText: position2,
        responseText: response2,
        score: 2,
        confidence: 0.93,
        fact: "Вы ответили на позицию доводом и не проверили, что за ней стоит.",
        effect: "Директор повторил требование; интерес «скорость решений» не прояснился.",
        improvement: "Назовите возможный интерес и спросите, верно ли вы поняли.",
        interestHypothesis: "Сохранить быстрые решения на площадке",
        interestConfirmed: false,
      },
      {
        opportunityId: "O3",
        positionTurnId: "position-o3",
        responseTurnId: "response-o3",
        reactionTurnId: "reaction-o3",
        positionText: position3,
        responseText: response3,
        score: 4,
        confidence: 0.96,
        fact: "Вы связали два подтверждённых интереса и проверили общее понимание.",
        effect: "Директор согласился обсуждать ограниченный пилот в одном подразделении.",
        improvement: "Следующий шаг — договориться о критериях пилота.",
        interestHypothesis: "Ограничить нагрузку и оставить решения на площадке",
        interestConfirmed: true,
      },
    ],
    outcomeTitle: "Директор готов обсуждать ограниченный пилот",
    outcomeDetails: "При сохранении скорости решений и ограничении нагрузки на мастеров.",
    outcomeShort: "пилот обсуждается",
    interestNotes: {
      "Не перегрузить мастеров до запуска линии": "подтвердил в ответ на ваш вопрос · 01:20",
      "Сохранить быстрые решения на площадке": "уточнил сам · 06:45",
      "Заранее объяснить сотрудникам цель изменений": "директор упомянул в итоге, вопросом не проверено",
      "Сохранить доверие коллектива к головной компании": "предположение, в разговоре не звучало",
    },
    outcomeConditions: [
      "ограничить нагрузку на мастеров",
      "оставить оперативные решения на площадке",
      "заранее объяснить цель сотрудникам",
    ],
    confirmedInterests: [
      "Не перегрузить мастеров до запуска линии",
      "Сохранить быстрые решения на площадке",
    ],
    unconfirmedHypotheses: [
      "Заранее объяснить сотрудникам цель изменений",
      "Сохранить доверие коллектива к головной компании",
    ],
    keyMomentTurnId: "position-o2",
    improvedWording: "Назовите возможный интерес и проверьте его вопросом.",
    nextStep: "Варианты взаимной выгоды",
    criticalError: false,
    rubricVersion: "B3-L2-rubric-1.0",
    modelVersion: "reference-preview",
    analyzedAt: new Date(startedMs + 680_000).toISOString(),
  },
};
