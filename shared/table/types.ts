// Contract shared by the client and the server.
// The supplier's hidden rules never leave the server: the client only sees TableState.

export type ConditionId = "price" | "qty" | "term" | "payment" | "warranty";
export type CardId = "question" | "anchor" | "criterion" | "concession" | "package" | "summary";
export type Difficulty = "basic" | "medium" | "high";
export type MethodId = "spin" | "harvard" | "batna";
export type FormatId = "ai" | "table" | "choice";

/** A package is one option index per condition (0 = best for the participant). */
export type Package = Record<ConditionId, number>;

export interface TrainingSettings {
  format: FormatId;
  method: MethodId;
  stage: string;
  skill: string;
  topic: string;
  role: string;
  difficulty: Difficulty;
}

export type Move =
  | { card: "question"; questionId: string }
  | { card: "anchor"; pkg: Package }
  | { card: "criterion"; criterionId: string }
  | { card: "concession"; give: ConditionId; giveIndex: number; ask: ConditionId; askIndex: number }
  | { card: "package"; pkg: Package; confirmRedLine?: boolean }
  | { card: "summary" };

export type ChipOwner = "supplier" | "you" | "agreed";

export interface JournalEntry {
  turn: number;
  who: "supplier" | "you";
  text: string;
  start?: boolean;
}

export interface MotiveState {
  id: string;
  title: string;
  short: string;
  revealed: boolean;
  text?: string;
  source?: string;
  turn?: number;
}

export interface ConcessionRecord {
  turn: number;
  condition: ConditionId;
  from: number;
  to: number;
  conditional: boolean;
  via: CardId;
  exchange: string;
  /** What the concession was exchanged for: a condition or the whole package. */
  ask: ConditionId | "package" | null;
}

export interface MoveRecord {
  turn: number;
  card: CardId;
  change: string;
  tokensBefore: number;
  tokensAfter: number;
  trustDelta: number;
  pointsDelta: number;
  reaction: string;
  outcome: "info" | "motive" | "accepted" | "countered" | "rejected" | "deal";
  userLine: string;
  supplierLine: string;
  redLineViolated: boolean;
}

export type TableStatus = "active" | "deal" | "no_deal" | "aborted";

export interface TableState {
  id: string;
  scenarioId: string;
  settings: TrainingSettings;
  maxTurns: number;
  tokensTotal: number;
  /** Number of the next turn (1-based); equals maxTurns + 1 when the moves ran out. */
  turn: number;
  status: TableStatus;
  endReason?: "deal" | "turns" | "manual";
  tokensLeft: number;
  trust: number;
  points: number;
  lastDelta: { trust: number; points: number; reason: string } | null;
  supplierOffer: Package;
  position: Package;
  tableOwner: "supplier" | "you";
  changed: ConditionId[];
  agreed: ConditionId[];
  cardsLeft: Record<CardId, number>;
  motives: MotiveState[];
  learned: { title: string; text: string; source: string } | null;
  journal: JournalEntry[];
  reply: { turn: number; label: string; text: string };
  dealReady: boolean;
  acceptedPackage: Package | null;
  lastProposal: Package | null;
  concessions: ConcessionRecord[];
  moves: MoveRecord[];
  askedQuestions: string[];
  usedCriteria: string[];
  startedAt: string;
  endedAt?: string;
  elapsedSec: number;
}

export interface TurnResponse {
  state: TableState;
}

export interface ReportText {
  strengths: string[];
  growth: string[];
  skillSummary: string;
  missing: string;
  nextAttempt: string;
  altNote: string;
  model: string;
}

export interface SessionReport {
  deal: boolean;
  score: number;
  anchors: string[];
  concessionsUsed: number;
  conditional: number;
  free: number;
  /** Another package the supplier would accept inside the participant's red lines. */
  alternative: Package | null;
  text: ReportText;
}

/** What the History screen keeps about a finished training (localStorage). */
export interface HistoryItem {
  id: string;
  format: FormatId;
  title: string;
  scenarioId: string;
  difficulty: Difficulty;
  skill: string;
  method: MethodId;
  finishedAt: string;
  minutes: number;
  deal: boolean;
  sum: number;
  points: number;
  score: number;
}
