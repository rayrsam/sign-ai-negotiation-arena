import { useEffect, useSyncExternalStore } from "react";

export type ScreenId = "settings" | "howto" | "table" | "result" | "report" | "full-report" | "history";

const screenIds: ScreenId[] = ["settings", "howto", "table", "result", "report", "full-report", "history"];

/** Table screens share the app-wide `?screen=` parameter with the lessons under the `table-` prefix. */
function screenParam(screen: ScreenId) {
  return screen === "table" ? "table" : `table-${screen}`;
}

export function tableScreenOf(param: string | null): ScreenId | undefined {
  return screenIds.find((screen) => screenParam(screen) === param);
}

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

window.addEventListener("popstate", notify);

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  return window.location.search;
}

export function useSearch() {
  return useSyncExternalStore(subscribe, snapshot);
}

export function currentParams() {
  return new URLSearchParams(window.location.search);
}

export function navigate(screen: ScreenId, params: Record<string, string | undefined> = {}, replace = false) {
  const search = new URLSearchParams();
  search.set("screen", screenParam(screen));
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const url = `${window.location.pathname}${search.size ? `?${search}` : ""}`;
  if (replace) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
  window.scrollTo(0, 0);
  notify();
}

export function Redirect({ to, params }: { to: ScreenId; params?: Record<string, string | undefined> }) {
  useEffect(() => navigate(to, params, true), [to, params]);
  return null;
}
