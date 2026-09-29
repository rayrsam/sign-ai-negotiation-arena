// The director's position, not the user's wording, selects the current opportunity.
export function inferB3L2Opportunity(reply: string, previous = "O1"): string {
  const value = reply.toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
  if (/сокращ|угроз|сотрудник.{0,35}оцен|оцен.{0,35}сотрудник|доверие коллектив/.test(value)) return "O3";
  if (/скорост|быстр|локальн|согласован|решени.{0,30}на месте|корпоративн.{0,30}процедур/.test(value)) return "O2";
  return previous;
}
