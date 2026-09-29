import { X } from "lucide-react";
import { ArenaHeader } from "@/components/arena-header";
import { BriefSidebar } from "@/components/meeting/brief-sidebar";
import { ConversationPanel } from "@/components/meeting/conversation-panel";
import { MeetingStage } from "@/components/meeting/meeting-stage";
import { SessionDialog } from "@/components/meeting/session-dialog";
import { Button } from "@/components/ui/button";
import { useMeetingSession } from "@/hooks/use-meeting-session";
import { cn } from "@/lib/utils";

export function MeetingScreen() {
  const session = useMeetingSession();

  function finishAndOpenReport() {
    const attemptId = session.finishSession();
    if (!attemptId) return;
    window.location.search = `?screen=report&attempt=${encodeURIComponent(attemptId)}`;
  }

  return (
    <main className="arena-shell meeting-screen">
      <ArenaHeader
        activeStep={3}
        actions={(
          <>
            <Button
              type="button"
              variant="outline"
              className={cn("pause-action rounded-full", session.activeDialog === "pause" && "is-active")}
              aria-haspopup="dialog"
              onClick={() => session.openDialog("pause")}
              disabled={session.isFinished}
            >
              Пауза
            </Button>
            <Button
              type="button"
              variant="outline"
              className="finish-action rounded-full"
              aria-haspopup="dialog"
              onClick={() => session.openDialog("finish")}
              disabled={session.isFinished}
            >
              Завершить
            </Button>
          </>
        )}
      />

      {session.notice && (
        <div className="notice" role="status">
          <span>{session.notice}</span>
          <button type="button" onClick={session.clearNotice} title="Закрыть"><X size={16} /></button>
        </div>
      )}

      <section className="arena-grid">
        <ConversationPanel
          messages={session.messages}
          isSending={session.isSending}
          hiddenMessageId={session.speakingMessageId}
          conversationRef={session.conversationRef}
        />
        <MeetingStage
          input={session.input}
          setInput={session.setInput}
          hasTranscribedInput={session.hasTranscribedInput}
          inputMode={session.inputMode}
          setInputMode={session.setInputMode}
          isSending={session.isSending}
          isRecording={session.isRecording}
          isTranscribing={session.isTranscribing}
          isSpeaking={session.isSpeaking}
          micLevels={session.micLevels}
          recordingTime={session.recordingTime}
          isPaused={session.isPaused}
          isFinished={session.isFinished}
          hintsAvailable={session.hintsAvailable}
          hintVisible={session.hintVisible}
          activeDialog={session.activeDialog}
          completionState={session.completionState}
          transcriptRef={session.transcriptRef}
          latestAssistantMessage={session.latestAssistantMessage}
          onToggleRecording={session.toggleRecording}
          onCancelRecording={session.cancelRecording}
          onSendMessage={session.sendMessage}
          onOpenDialog={session.openDialog}
          onOpenReport={() => {
            window.location.search = `?screen=report&attempt=${encodeURIComponent(session.sessionId)}`;
          }}
        />
        <BriefSidebar
          briefOpen={session.briefOpen}
          onToggleBrief={() => session.setBriefOpen((value) => !value)}
          hintVisible={session.hintVisible}
          hintsAvailable={session.hintsAvailable}
          hintLevel={session.hintLevel}
          hintText={session.currentHintText}
          inputMode={session.inputMode}
          onCloseHint={session.closeHint}
          onCopyHint={session.copyHintToDraft}
        />
      </section>

      <SessionDialog
        activeDialog={session.activeDialog}
        onDismiss={session.dismissDialog}
        onFinish={finishAndOpenReport}
        onRevealHint={session.revealHint}
        onRetryConnection={session.retryConnection}
        onSwitchToText={session.switchToTextAfterError}
      />
    </main>
  );
}
