import { useSyncExternalStore } from "react";

/**
 * The current screen lives in the `?screen=` query. The table and the free negotiations switch screens
 * with the History API, so every module router notifies the same subscribers — including the root App,
 * which picks the module.
 */
const listeners = new Set<() => void>();

export function notifySearch() {
  listeners.forEach((listener) => listener());
}

window.addEventListener("popstate", notifySearch);

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
