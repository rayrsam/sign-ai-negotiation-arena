import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SessionReport, TableState } from "../../shared/table/types";

// Table sessions are kept on the server: the supplier's rules and the token bookkeeping
// are authoritative here, the browser only renders the public state.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataDirectory = path.join(root, "data");
const storeFile = path.join(dataDirectory, "tables.json");

interface Stored { state: TableState; report?: SessionReport }

let tables: Record<string, Stored> = {};
try {
  if (existsSync(storeFile)) tables = JSON.parse(readFileSync(storeFile, "utf8")) as Record<string, Stored>;
} catch {
  tables = {};
}

let writeTimer: NodeJS.Timeout | null = null;
function persist() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      mkdirSync(dataDirectory, { recursive: true });
      const ids = Object.keys(tables);
      // Keep the store small: the latest 200 tables are enough for history and reports.
      for (const id of ids.slice(0, Math.max(0, ids.length - 200))) delete tables[id];
      writeFileSync(storeFile, JSON.stringify(tables));
    } catch (error) {
      console.error("Не удалось сохранить столы:", error);
    }
  }, 150);
}

export function saveTable(state: TableState) {
  tables[state.id] = { ...tables[state.id], state };
  persist();
}

export function getTable(id: string) {
  return tables[id]?.state ?? null;
}

export function saveReport(id: string, report: SessionReport) {
  if (!tables[id]) return;
  tables[id].report = report;
  persist();
}

export function getReport(id: string) {
  return tables[id]?.report ?? null;
}
