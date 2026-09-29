import { useEffect } from "react";
import { notifySearch } from "@/lib/search";

export { currentParams, useSearch } from "@/lib/search";

export type ScreenId =
  | "setup" | "counterparty" | "details" | "exact" | "random" | "random-result" | "seed"
  | "brief" | "meeting" | "report" | "full-report" | "replay";

const screenIds: ScreenId[] = [
  "setup", "counterparty", "details", "exact", "random", "random-result", "seed",
  "brief", "meeting", "report", "full-report", "replay",
];

/** Free negotiation screens share the app-wide `?screen=` parameter under the `free-` prefix. */
function screenParam(screen: ScreenId) {
  return `free-${screen}`;
}

export function freeScreenOf(param: string | null): ScreenId | undefined {
  return screenIds.find((screen) => screenParam(screen) === param);
}

export function navigate(screen: ScreenId, params: Record<string, string | undefined> = {}, replace = false) {
  const search = new URLSearchParams();
  search.set("screen", screenParam(screen));
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const url = `${window.location.pathname}${search.size ? `?${search}` : ""}`;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
  window.scrollTo(0, 0);
  notifySearch();
}

export function goBack(fallback: ScreenId) {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback);
}


export function Redirect({ to }: { to: ScreenId }) {
  useEffect(() => navigate(to, {}, true), [to]);
  return null;
}
