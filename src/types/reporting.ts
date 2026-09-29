import type { ChatMessage } from "@/types/meeting";

export type HintLevel = 1 | 2 | 3;
export type LessonResultStatus = "independent" | "supported" | "repeat" | "unassessed";

export interface SessionEvent {
  id: string;
  clientEventId?: string;
  type: string;
  occurredAt: string;
  turnId?: string;
  opportunityId?: string;
  hintLevel?: HintLevel;
  details?: Record<string, string | number | boolean | null>;
}

export interface HintUsage {
  id: string;
  level: HintLevel;
  occurredAt: string;
  afterTurnId?: string;
  opportunityId?: string;
  text?: string;
}

export interface OpportunityAnalysis {
  opportunityId: string;
  positionTurnId: string;
  responseTurnId: string;
  reactionTurnId?: string;
  followUpTurnId?: string;
  positionText: string;
  responseText: string;
  followUpText?: string;
  score: number | null;
  confidence: number;
  fact: string;
  effect: string;
  improvement: string;
  interestHypothesis?: string;
  interestConfirmed: boolean;
}

export interface ReportAnalysis {
  status: LessonResultStatus;
  score: number | null;
  validOpportunityCount: number;
  opportunities: OpportunityAnalysis[];
  outcomeTitle: string;
  outcomeDetails: string;
  /** Short outcome label for compact cells, e.g. «пилот обсуждается». */
  outcomeShort?: string;
  /** Evidence line under each interest, keyed by interest text. */
  interestNotes?: Record<string, string>;
  outcomeConditions: string[];
  confirmedInterests: string[];
  unconfirmedHypotheses: string[];
  keyMomentTurnId?: string;
  improvedWording: string;
  nextStep: string;
  criticalError: boolean;
  rubricVersion: string;
  modelVersion: string;
  analyzedAt: string;
}

export interface StoredAttempt {
  schemaVersion: 1;
  id: string;
  lessonId: "B3-L2";
  scenarioId: "SC-B3-L2-PLANT-PILOT";
  scenarioVersion: string;
  rubricVersion: string;
  startedAt: string;
  endedAt?: string;
  finishReason?: "manual" | "system" | "technical";
  transcript: ChatMessage[];
  events: SessionEvent[];
  hints: HintUsage[];
  completionState?: "ACTIVE" | "CLOSING_REQUIRED" | "CLOSING_REPLY" | "EVALUATING" | "COMPLETED";
  completionReason?: "GOAL_COMPLETE" | "LIMIT_REACHED" | "MANUAL" | "RESISTANCE" | "TECHNICAL";
  parentAttemptId?: string;
  replayFromTurnId?: string;
  analysis?: ReportAnalysis;
}
