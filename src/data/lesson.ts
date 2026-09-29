import type { ChatMessage, DialogContent, DialogKind } from "@/types/meeting";

export const dialogContent: Record<DialogKind, DialogContent> = {
  intro: {
    title: "Как устроена практика",
    description:
      "Готовых вариантов и текущего балла во время разговора нет. Подсказка появляется только по вашему запросу и влияет лишь на отметку самостоятельности.",
    secondary: "К уроку",
    primary: "Начать практику",
  },
  hint: {
    title: "Подсказка",
    description:
      "Подсказка не уменьшает оценку качества ответа, но попытка будет отмечена как выполненная с поддержкой.",
    secondary: "Отмена",
    primary: "Показать подсказку",
  },
  pause: {
    title: "Разговор на паузе",
    description:
      "Директор не продолжает реплику, пока вы не вернётесь.\nПоследняя реплика сохранена.",
    secondary: "Завершить попытку",
    primary: "Продолжить",
  },
  finish: {
    title: "Завершить попытку?",
    description:
      "Вы перейдёте к разбору текущего результата. Если навык ещё не удалось проверить, система предложит повтор.",
    secondary: "Завершить",
    primary: "Продолжить разговор",
  },
  connection: {
    title: "Связь прервалась",
    description: "Ваша реплика сохранена, попытка не потеряна. Можно повторить отправку или продолжить текстом.",
    secondary: "Перейти в текст",
    primary: "Повторить",
  },
};

export const openingMessage =
  "Я сразу обозначу позицию: новые кадровые процедуры нам сейчас не нужны. Через десять недель запускаем линию, мастера перегружены. Вернёмся к этому через полгода.";

export const initialMessages: ChatMessage[] = [
  { id: "opening", role: "assistant", content: openingMessage },
];

export const progressSteps = [
  { number: 1, label: "Теория" },
  { number: 2, label: "Бриф" },
  { number: 3, label: "Встреча" },
  { number: 4, label: "Разбор" },
];
