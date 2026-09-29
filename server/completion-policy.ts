import { inferB3L2Opportunity } from "../shared/lesson-opportunity";

export type CompletionState = "ACTIVE" | "CLOSING_REQUIRED" | "COMPLETED";
export type CompletionReason = "GOAL_COMPLETE" | "LIMIT_REACHED" | "RESISTANCE";
export type ScenarioOutcome = "SUCCESS" | "PARTIAL" | "RESISTANCE" | "NO_DEAL" | "UNKNOWN";

export interface CompletionPolicy {
  minValidOpportunities: number;
  targetValidOpportunities: number;
  maxUserTurns: number;
  requiresScenarioOutcome: boolean;
  requiresClosingAction: boolean;
  version: string;
}

export const b3L2CompletionPolicy: CompletionPolicy = {
  minValidOpportunities: 2,
  targetValidOpportunities: 3,
  maxUserTurns: 8,
  requiresScenarioOutcome: true,
  requiresClosingAction: true,
  version: "B3-L2-completion-1.0",
};

interface Turn {
  role: "user" | "assistant";
  content: string;
}

export interface CompletionDecision {
  state: CompletionState;
  reason?: CompletionReason;
  validOpportunityCount: number;
  userTurnCount: number;
  currentOpportunityId: string;
  scenarioOutcome: ScenarioOutcome;
  policyVersion: string;
}

function classifyOutcome(reply: string): ScenarioOutcome {
  const text = reply.toLocaleLowerCase("ru-RU").replaceAll("ё", "е");
  if (/разговор окончен|встреча окончена|прекращаю встречу|не вижу смысла продолжать/.test(text)) return "RESISTANCE";
  if (/договорились.{0,50}пилот|согласен.{0,50}пилот|начнем пилот/.test(text)) return "SUCCESS";
  if (/можно обсуждать пилот|готов обсудить пилот|обсудим пилот|рабочую группу|согласовать следующий шаг/.test(text)) return "PARTIAL";
  if (/пилот пока ничего не меняет|не готов.{0,40}пилот|не согласен.{0,40}пилот/.test(text)) return "NO_DEAL";
  return "UNKNOWN";
}

export function assessCompletion(
  turns: Turn[],
  policy: CompletionPolicy = b3L2CompletionPolicy,
): CompletionDecision {
  let currentOpportunityId = "O1";
  let userTurnCount = 0;
  const answeredOpportunities = new Set<string>();
  for (const turn of turns) {
    if (turn.role === "user") {
      userTurnCount += 1;
      answeredOpportunities.add(currentOpportunityId);
    } else {
      currentOpportunityId = inferB3L2Opportunity(turn.content, currentOpportunityId);
    }
  }

  const latestAssistant = [...turns].reverse().find((turn) => turn.role === "assistant")?.content ?? "";
  const scenarioOutcome = classifyOutcome(latestAssistant);
  let state: CompletionState = "ACTIVE";
  let reason: CompletionReason | undefined;

  if (scenarioOutcome === "RESISTANCE") {
    state = "COMPLETED";
    reason = "RESISTANCE";
  } else if (
    answeredOpportunities.size >= policy.minValidOpportunities &&
    (!policy.requiresScenarioOutcome || scenarioOutcome !== "UNKNOWN")
  ) {
    state = "CLOSING_REQUIRED";
    reason = "GOAL_COMPLETE";
  } else if (userTurnCount >= policy.maxUserTurns) {
    state = "CLOSING_REQUIRED";
    reason = "LIMIT_REACHED";
  }

  return {
    state,
    reason,
    validOpportunityCount: answeredOpportunities.size,
    userTurnCount,
    currentOpportunityId,
    scenarioOutcome,
    policyVersion: policy.version,
  };
}

export function closingRequest(reason: CompletionReason): string {
  return reason === "LIMIT_REACHED"
    ? "Давайте на этом остановимся. Подведите итог: что вы поняли и какой следующий шаг предлагаете?"
    : "Мы обсудили главное. Подведите итог и предложите конкретный следующий шаг.";
}
