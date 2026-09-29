import type { TheoryLesson, TheoryQuestion, TheoryVerdict } from "@/types/theory";

export const verdictLabel: Record<TheoryVerdict, string> = {
  correct: "Верно",
  partial: "Не совсем так",
  incorrect: "Неверно",
};

export const verdictBannerLabel: Record<TheoryVerdict, string> = {
  correct: "Почему так",
  partial: "Не совсем так",
  incorrect: "Неверно",
};

const placeholderMemo = [
  "Позиция — что человек требует",
  "Интерес — что он защищает",
  "Проверка — вопрос «верно ли я понял?»",
];

const placeholderQuestions: TheoryQuestion[] = [1, 2, 3, 4].map((n) => ({
  situation: `Реплика собеседника для ситуации ${n} появится здесь, когда добавят содержание урока.`,
  question: `Текст вопроса к ситуации ${n} появится позже.`,
  options: [
    { letter: "A", text: "Вариант A появится позже.", verdict: "partial" },
    { letter: "B", text: "Вариант B появится позже.", verdict: "correct" },
    { letter: "C", text: "Вариант C появится позже.", verdict: "incorrect" },
  ],
  explanation: "Пояснение к ответу появится здесь, когда добавят содержание урока.",
}));

const placeholderCharacter = {
  name: "Собеседник",
  subtitle: "Персонаж появится позже",
};

const lesson32Questions: TheoryQuestion[] = [
  {
    situation: "Контрагент говорит: «Отложим изменения на полгода».",
    question: "Что перед вами?",
    options: [
      { letter: "A", text: "Интерес контрагента.", verdict: "partial" },
      { letter: "B", text: "Позиция контрагента.", verdict: "correct" },
      { letter: "C", text: "Объективный критерий.", verdict: "incorrect" },
    ],
    explanation: "Это позиция — заявленное требование. Она говорит, чего человек требует, но ещё не объясняет, что он пытается защитить.",
  },
  {
    situation: "Реплика: «Ваши процедуры только замедлят работу».",
    question: "Какой ответ лучше переводит разговор к интересу?",
    options: [
      { letter: "A", text: "«Нет, наши процедуры давно доказали эффективность».", verdict: "partial" },
      { letter: "B", text: "«Правильно понимаю, вас беспокоит, что новые согласования замедлят решения на заводе?»", verdict: "correct" },
      { letter: "C", text: "«Вы просто не хотите ничего менять».", verdict: "incorrect" },
    ],
    explanation: "Ответ называет возможный интерес как гипотезу и сразу проверяет её. Это снижает риск приписать человеку мотив.",
  },
  {
    situation: "",
    question: "Какой интерес уже подтверждён контрагентом?",
    options: [
      { letter: "A", text: "«Директор боится потерять влияние».", verdict: "incorrect" },
      { letter: "B", text: "«Директор подтвердил, что для него критична скорость оперативных решений».", verdict: "correct" },
      { letter: "C", text: "«Директор не хочет внедрять новые процедуры».", verdict: "partial" },
    ],
    explanation: "Интерес считается подтверждённым, когда сторона сама согласилась с формулировкой или уточнила её. Вариант A остаётся предположением, вариант C повторяет позицию.",
  },
  {
    situation: "Контрагент подтвердил, что опасается перегрузить мастеров.",
    question: "Как лучше зафиксировать понимание?",
    options: [
      { letter: "A", text: "«Значит, вы против единых стандартов».", verdict: "incorrect" },
      { letter: "B", text: "«То есть никаких изменений вы не допустите».", verdict: "partial" },
      { letter: "C", text: "«Верно понимаю, главное — не отвлечь мастеров от запуска, а не отказаться от изменений в принципе?»", verdict: "correct" },
    ],
    explanation: "Фраза отделяет заявленное требование от причины и оставляет контрагенту возможность поправить понимание.",
  },
];

export const theoryLessons: Record<string, TheoryLesson> = {
  "00": {
    id: "00",
    lessonTitle: "Шаблон урока",
    blockLabel: "Отладка · Шаблон",
    character: placeholderCharacter,
    memo: placeholderMemo,
    questions: placeholderQuestions,
  },
  "32": {
    id: "32",
    lessonTitle: "Позиции и интересы",
    blockLabel: "Блок 3 · Урок 2",
    character: {
      name: "Директор завода",
      subtitle: "AI-контрагент · региональный завод",
    },
    memo: placeholderMemo,
    questions: lesson32Questions,
  },
};

function placeholderLesson(id: string): TheoryLesson {
  const [block, lesson] = id;
  const isBlockLesson = /^\d\d$/.test(id);

  return {
    id,
    lessonTitle: "Урок в разработке",
    blockLabel: isBlockLesson ? `Блок ${block} · Урок ${lesson}` : "Материалы уточняются",
    character: placeholderCharacter,
    memo: placeholderMemo,
    questions: placeholderQuestions,
  };
}

export function getTheoryLesson(id: string): TheoryLesson {
  return theoryLessons[id] ?? placeholderLesson(id);
}
