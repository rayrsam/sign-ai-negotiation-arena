import { sumOf } from "../../../shared/table/scenario";
import type { HistoryItem, SessionReport, TableState } from "../../../shared/table/types";
import { scenario } from "../../../shared/table/scenario";

const KEY = "table-talks:history:v1";
const SETTINGS_KEY = "table-talks:settings:v1";
const MAX_ITEMS = 60;

export function readHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as HistoryItem[] : [];
  } catch {
    return [];
  }
}

function write(items: HistoryItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // History is a convenience: the server keeps the table itself.
  }
}

/** Saves (or updates) a finished table in the training history. */
export function rememberTable(state: TableState, report?: SessionReport) {
  if (state.status === "active" || state.status === "aborted") return;
  const pkg = state.acceptedPackage ?? state.lastProposal ?? state.supplierOffer;
  const previous = readHistory().find((item) => item.id === state.id);
  const item: HistoryItem = {
    id: state.id,
    format: "table",
    title: scenario.title,
    scenarioId: state.scenarioId,
    difficulty: state.settings.difficulty,
    skill: state.settings.skill,
    method: state.settings.method,
    finishedAt: state.endedAt ?? new Date().toISOString(),
    minutes: Math.max(1, Math.round(state.elapsedSec / 60)),
    deal: state.status === "deal",
    sum: sumOf(pkg),
    points: state.points,
    score: report?.score ?? previous?.score ?? -1,
  };
  write([item, ...readHistory().filter((entry) => entry.id !== state.id)]);
}

export function readSettingsDraft<T>(): T | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export function writeSettingsDraft(value: unknown) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
  } catch {
    // optional
  }
}
