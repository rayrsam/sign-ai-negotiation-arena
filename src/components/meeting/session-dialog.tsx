import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CounterpartyAvatar } from "@/components/counterparty-avatar";
import { ProgressNumber } from "@/components/progress-number";
import { LongArrow } from "@/components/long-arrow";
import { Button } from "@/components/ui/button";
import { dialogContent } from "@/data/lesson";
import { cn } from "@/lib/utils";
import type { DialogKind } from "@/types/meeting";

// Audio preview bars of the reference: [left offset, height, accent].
const previewBars = [[0, 7.4, 0], [9.3, 14.9, 0], [18.6, 20.5, 0], [29.7, 13, 0], [39.1, 22.3, 1], [48.4, 18.6, 0], [57.7, 9.3, 0], [67, 14.9, 0], [76.3, 26, 1], [87.4, 18.6, 0], [96.7, 13, 0], [106, 7.4, 0], [115.3, 7.4, 0], [124.6, 7.4, 0], [133.9, 14.9, 0], [143.2, 20.5, 0], [152.5, 13, 0], [161.8, 22.3, 1], [173, 18.6, 0], [182.3, 9.3, 0], [191.6, 14.9, 0], [200.9, 26, 1], [210.2, 18.6, 0], [221.4, 13, 0], [230.7, 7.4, 0], [238.1, 9.3, 0], [247.4, 14.9, 0], [256.7, 26, 1], [267.9, 22.3, 1], [277.2, 13, 0], [286.5, 7.4, 0], [293.9, 7.4, 0], [303.2, 14.9, 0], [314.4, 20.5, 0], [323.7, 13, 0], [333, 13, 0], [342.3, 7.4, 0]] as const;

interface SessionDialogProps {
  activeDialog: DialogKind | null;
  onDismiss: () => void;
  onFinish: () => void;
  onRevealHint: () => void;
  onRetryConnection: () => void;
  onSwitchToText: () => void;
}

export function SessionDialog({ activeDialog, onDismiss, onFinish, onRevealHint, onRetryConnection, onSwitchToText }: SessionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const currentDialog = activeDialog ? dialogContent[activeDialog] : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeDialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>(".dialog-primary")?.focus();
    }
    if (!activeDialog && dialog.open) dialog.close();
  }, [activeDialog]);

  // Rendered in <body>, outside the zoomed stage: engines differ in how ancestor zoom
  // affects top-layer boxes and ::backdrop, which made the dimming drift on scaled screens.
  return createPortal(
    <dialog
      ref={dialogRef}
      className={cn("session-dialog", activeDialog && `${activeDialog}-dialog`)}
      aria-labelledby="session-dialog-title"
      aria-describedby="session-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        if (activeDialog !== "intro") onDismiss();
      }}
      onClick={(event) => {
        if (activeDialog === "intro" || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom
        ) onDismiss();
      }}
    >
      {activeDialog === "intro" ? (
        <div className="practice-intro-layout">
          <div className="practice-intro-copy">
            <h2 id="session-dialog-title">Как устроена практика</h2>
            <ol className="practice-steps">
              <li><ProgressNumber number={1} /><div><strong>Прочитайте бриф</strong><small>узнайте свою роль, задачу и доступные факты</small></div></li>
              <li><ProgressNumber number={2} /><div><strong>Поговорите с AI-контрагентом</strong><small>отвечайте своими словами, голосом или текстом</small></div></li>
              <li><ProgressNumber number={3} /><div><strong>Получите разбор</strong><small>посмотрите, что сработало и что можно улучшить</small></div></li>
            </ol>
            <p id="session-dialog-description" className="practice-dialog-description">
              Готовых вариантов и текущего балла во время разговора нет.
              Подсказка появляется только по вашему запросу и влияет лишь на отметку самостоятельности.
            </p>
            <div className="session-dialog-actions">
              <Button type="button" className="dialog-primary" onClick={onDismiss}>
                Начать практику<LongArrow />
              </Button>
              <Button type="button" variant="outline" className="dialog-secondary" onClick={() => { window.location.search = "?screen=intro"; }}>
                К уроку
              </Button>
            </div>
          </div>
          <div className="practice-intro-preview" aria-hidden="true">
            <div className="practice-intro-avatar"><CounterpartyAvatar /></div>
            <div className="practice-audio-preview">
              <span className="practice-record-dot"><img src="/icons/microphone.svg" alt="" /></span>
              <span className="practice-audio-time"><i />00:07</span>
              <div className="practice-waveform">
                {previewBars.map(([left, height, accent]) => (
                  <i key={left} className={cn(accent && "accent")} style={{ left: `${left}px`, height: `${height}px` }} />
                ))}
              </div>
              <span className="practice-audio-close">
                <svg viewBox="0 0 22 20" fill="none"><path d="M2 2 20 18M20 2 2 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
              </span>
            </div>
            <div className="practice-duration"><i />1 кейс · около 15 минут</div>
          </div>
        </div>
      ) : (
        <>
          <h2 id="session-dialog-title">{currentDialog?.title}</h2>
          <p id="session-dialog-description">{currentDialog?.description}</p>
          <div className="session-dialog-actions">
            <Button
              type="button"
              variant="outline"
              className="dialog-secondary"
              onClick={activeDialog === "hint" ? onDismiss : activeDialog === "connection" ? onSwitchToText : onFinish}
            >
              {currentDialog?.secondary}
            </Button>
            <Button
              type="button"
              className="dialog-primary"
              onClick={() => {
                if (activeDialog === "connection") { onRetryConnection(); return; }
                if (activeDialog === "hint") onRevealHint();
                onDismiss();
              }}
            >
              {currentDialog?.primary}<LongArrow />
            </Button>
          </div>
        </>
      )}
    </dialog>,
    document.body,
  );
}
