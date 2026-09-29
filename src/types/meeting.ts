export type ChatRole = "user" | "assistant";
export type DialogKind = "intro" | "hint" | "pause" | "finish" | "connection";
export type SessionState = "active" | "paused" | "finished";
export type CompletionState = "ACTIVE" | "CLOSING_REQUIRED" | "CLOSING_REPLY" | "EVALUATING" | "COMPLETED";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
}

export interface DialogContent {
  title: string;
  description: string;
  secondary: string;
  primary: string;
}
