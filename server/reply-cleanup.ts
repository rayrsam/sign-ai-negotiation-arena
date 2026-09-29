/**
 * YandexGPT sometimes continues the dialogue on its own ("Пользователь: …") or prefixes
 * the line with the speaker name. Only the director's own line may be shown and voiced.
 */
const speakerLine = /^\s*(?:\*\*)?(?:директор(?: завода)?|ai-контрагент|контрагент|ассистент|assistant)(?:\*\*)?\s*:\s*/i;
const foreignTurn = /(?:^|\n)\s*(?:\*\*)?(?:пользователь|вы|участник|собеседник|менеджер|руководитель проекта|user|human|наставник)(?:\*\*)?\s*:/i;
const nextDirectorTurn = /\n\s*(?:\*\*)?(?:директор(?: завода)?|ассистент|assistant)(?:\*\*)?\s*:/i;

export function cleanDirectorReply(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").trim();
  text = text.replace(speakerLine, "");

  const foreign = text.search(foreignTurn);
  if (foreign >= 0) text = text.slice(0, foreign);
  const repeated = text.search(nextDirectorTurn);
  if (repeated >= 0) text = text.slice(0, repeated);

  // Strip wrapping quotes the model occasionally adds around the whole line.
  text = text.trim().replace(/^[«"](.*)[»"]$/s, "$1").trim();
  return text;
}
