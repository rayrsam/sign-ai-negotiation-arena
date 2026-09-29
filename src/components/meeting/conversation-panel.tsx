import type { RefObject } from "react";
import type { ChatMessage } from "@/types/meeting";
import { cn } from "@/lib/utils";

interface ConversationPanelProps {
  messages: ChatMessage[];
  isSending: boolean;
  hiddenMessageId?: string | null;
  conversationRef: RefObject<HTMLDivElement | null>;
}

export function ConversationPanel({ messages, isSending, hiddenMessageId, conversationRef }: ConversationPanelProps) {
  return (
    <aside className="conversation-panel">
      <div className="panel-heading">
        <h2>Разговор</h2>
        <p>Полный текст каждой реплики</p>
      </div>
      <div className="conversation-list" ref={conversationRef} aria-live="polite">
        {messages.filter((message) => message.id !== hiddenMessageId).map((message) => (
          <article key={message.id} className={cn("conversation-message", message.role)}>
            <strong>{message.role === "assistant" ? "Директор завода" : "Вы"}</strong>
            <p>{message.content}</p>
          </article>
        ))}
        {isSending && (
          <article className="conversation-message assistant pending">
            <strong>Директор завода</strong>
            <p>Формулирует ответ...</p>
          </article>
        )}
      </div>
    </aside>
  );
}
