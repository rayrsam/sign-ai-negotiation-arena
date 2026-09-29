import type { Dispatch, FormEventHandler, RefObject, SetStateAction } from "react";
import { CounterpartyAvatar } from "@/components/counterparty-avatar";
import { LongArrow } from "@/components/long-arrow";
import { cn } from "@/lib/utils";
import { MIC_LEVEL_COUNT } from "@/hooks/use-meeting-session";
import type { CompletionState, DialogKind } from "@/types/meeting";

interface MeetingStageProps {
  input: string;
  setInput: (value: string) => void;
  hasTranscribedInput: boolean;
  inputMode: "voice" | "text";
  setInputMode: Dispatch<SetStateAction<"voice" | "text">>;
  isSending: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  isSpeaking: boolean;
  micLevels: number[];
  recordingTime: string;
  isPaused: boolean;
  isFinished: boolean;
  hintsAvailable: boolean;
  hintVisible: boolean;
  activeDialog: DialogKind | null;
  completionState: CompletionState;
  transcriptRef: RefObject<HTMLTextAreaElement | null>;
  latestAssistantMessage: string;
  onToggleRecording: () => void;
  onCancelRecording: () => void;
  onSendMessage: FormEventHandler<HTMLFormElement>;
  onOpenDialog: (kind: DialogKind) => void;
  onOpenReport: () => void;
}

// Idle bar profile from the reference; live microphone levels replace it while recording.
const idleBars = [
  13.5, 27, 35.6, 22.1, 39.2, 30.7, 17.2, 27, 44.1, 30.7, 22.1, 13.5, 13.5, 13.5, 27, 35.6, 22.1, 39.2,
  30.7, 17.2, 27, 44.1, 30.7, 22.1, 13.5, 17.2, 27, 44.1, 39, 22.1, 13.5, 13.5, 27, 35.6, 22.1, 22.1,
];

function ProfileIcon() {
  return (
    <svg className="role-chip-icon" viewBox="-1 -1 29 29" fill="none" aria-hidden="true">
      <circle cx="13.5" cy="13.5" r="13.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M4 23.22C4 18.85 8.2 15.3 13.37 15.3C18.55 15.3 22.74 18.85 22.74 23.22M17.65 8.48C17.65 10.96 15.73 12.96 13.37 12.96C11.01 12.96 9.09 10.96 9.09 8.48C9.09 6.01 11.01 4 13.37 4C15.73 4 17.65 6.01 17.65 8.48Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicBadge() {
  return (
    <svg className="mic-badge" viewBox="0 0 43.2 43.2" aria-hidden="true">
      <circle cx="21.6" cy="21.6" r="21.6" fill="var(--mic-fill, #FF6547)" />
      <path
        fill="var(--mic-glyph, #544C4C)"
        d="M17.12 9.13C17.9 8.5 19.06 8.62 19.69 9.39C20.33 10.16 20.21 11.3 19.42 11.93L15.34 15.2C11.29 18.44 10.92 24.41 14.54 28.12C18.76 32.13 25.3 32.57 30.03 29.14L33.9 26.33C34.71 25.74 35.86 25.91 36.45 26.72C37.05 27.52 36.88 28.65 36.06 29.24L32.2 32.04C26.45 36.21 18.65 36 13.17 31.72L2.93 39.39C2.13 40 .98 39.84.37 39.05-.24 38.26-.08 37.12.72 36.52L10.63 29.09C6.95 23.86 7.85 16.55 13.04 12.4L17.12 9.13ZM25.14 10.86C27.89 8.74 31.78 9.03 34.18 11.53C37 14.47 36.65 19.22 33.43 21.7L26.81 26.8C24.1 28.89 20.28 28.63 17.87 26.21C14.97 23.3 15.28 18.49 18.53 15.97L25.14 10.86ZM31.64 13.99C30.49 12.79 28.61 12.65 27.29 13.67L20.68 18.78C19.11 19.99 18.96 22.31 20.36 23.71C21.52 24.88 23.36 25 24.66 23.99L31.28 18.89C32.83 17.69 33 15.41 31.64 13.99Z"
      />
    </svg>
  );
}

function SendIcon() {
  // Paper plane from the reference; coordinates are the reference 60×60 send button.
  return (
    <svg viewBox="1291 938.566 60 60" fill="none" aria-hidden="true">
      <path
        fill="currentColor"
        d="M1335.51 953.03C1336.29 952.838 1337.11 953.103 1337.62 953.713C1338.14 954.323 1338.26 955.174 1337.94 955.906L1325.28 985.03C1324.22 987.464 1320.73 987.357 1319.83 984.863C1317.99 979.82 1311.79 978.012 1307.53 981.281L1298.41 988.29C1297.49 987.237 1296.64 986.117 1295.87 984.942L1304.97 977.95C1310.7 973.547 1318.75 975.168 1322.5 980.886L1332.4 958.128L1308.55 964.034L1309.63 965.164C1310.44 966.001 1310.41 967.33 1309.57 968.133C1308.74 968.936 1307.41 968.909 1306.6 968.072L1304.08 965.445C1302.48 963.781 1303.29 961.011 1305.52 960.456L1335.51 953.03Z"
      />
    </svg>
  );
}

export function MeetingStage({
  input,
  setInput,
  hasTranscribedInput,
  inputMode,
  setInputMode,
  isSending,
  isRecording,
  isTranscribing,
  isSpeaking,
  micLevels,
  recordingTime,
  isPaused,
  isFinished,
  hintsAvailable,
  hintVisible,
  activeDialog,
  completionState,
  transcriptRef,
  latestAssistantMessage,
  onToggleRecording,
  onCancelRecording,
  onSendMessage,
  onOpenDialog,
  onOpenReport,
}: MeetingStageProps) {
  const isClosingWait = completionState === "CLOSING_REPLY" || completionState === "EVALUATING";
  const isClosingRequired = completionState === "CLOSING_REQUIRED";
  const inputLocked = isSpeaking || isFinished || isClosingWait;
  const showDraft = !isRecording && !isTranscribing && (inputMode === "text" || input.trim().length > 0);

  const statusText = isFinished && !isSpeaking ? "Встреча завершена"
    : activeDialog === "connection" ? "Нет связи"
      : isPaused ? "Пауза"
        : isSpeaking ? "Директор говорит"
          : isRecording ? `Идёт запись · ${recordingTime}`
            : isTranscribing ? "Распознаём речь"
              : isSending || isClosingWait ? "Директор отвечает"
                : isClosingRequired ? "Подведите итог"
                  : inputMode === "text" ? "Ваш ход · текст" : "Ваш ход";

  let toolbarChip: { text: string; tone?: "calm" } | null = null;
  if (isSpeaking) toolbarChip = { text: "Директор говорит" };
  else if (isFinished) toolbarChip = { text: "Встреча завершена", tone: "calm" };
  else if (isClosingWait || isSending) toolbarChip = { text: "Директор отвечает" };
  else if (isTranscribing) toolbarChip = { text: "Распознаём речь" };
  else if (hasTranscribedInput && showDraft) toolbarChip = { text: "Распознано — проверьте текст" };
  else if (isClosingRequired) toolbarChip = { text: "Подведите итог" };
  else if (hintVisible) toolbarChip = { text: "Ваш ход" };

  const showHintButton = hintsAvailable && !toolbarChip && !isRecording && completionState === "ACTIVE";
  const bars = isRecording && micLevels.length
    ? Array.from({ length: MIC_LEVEL_COUNT }, (_, index) => {
      const level = micLevels[index - (MIC_LEVEL_COUNT - micLevels.length)] ?? 0;
      // Keep the reference bar profile visible in quiet moments; the voice level lifts it.
      return Math.min(46, 13.5 + (idleBars[index] - 13.5) * 0.3 + level * 34);
    })
    : idleBars;

  let composer;
  if (isSpeaking || isFinished || isClosingWait || (isSending && !showDraft)) {
    const [title, text] = isSpeaking
      ? ["Слушайте", "Ввод откроется, когда директор\nзакончит реплику"]
      : isFinished
        ? ["Встреча завершена", "Директор подвёл итог.\nПосмотрите, что получилось."]
        : ["Директор отвечает", "Реплика появится через\nнесколько секунд"];
    composer = (
      <div className={cn("voice-composer", "is-waiting", isFinished && !isSpeaking && "is-finished")}>
        <span className="record-button is-idle" aria-hidden="true"><MicBadge /></span>
        <div className="voice-prompt" role="status">
          <strong>{title}</strong>
          <p>{text}</p>
        </div>
        {isFinished && !isSpeaking && (
          <button type="button" className="report-cta" onClick={onOpenReport}>
            Перейти к разбору<LongArrow />
          </button>
        )}
      </div>
    );
  } else if (showDraft) {
    composer = (
      <form className={cn("text-composer", hasTranscribedInput && "has-help")} onSubmit={onSendMessage}>
        <div className="composer-field">
          <textarea
            ref={transcriptRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={isClosingRequired ? "Подведите итог и предложите следующий шаг..." : "Напишите ответ..."}
            aria-label="Ваша реплика"
            aria-describedby={hasTranscribedInput ? "transcript-help" : undefined}
            disabled={isSending || isPaused || inputLocked}
            rows={2}
          />
          {hasTranscribedInput && (
            <p className="composer-help" id="transcript-help">Распознанный текст можно исправить до отправки</p>
          )}
        </div>
        <button
          type="submit"
          className="send-action"
          disabled={!input.trim() || isSending || isPaused || inputLocked}
          title={isClosingRequired ? "Подвести итог" : "Отправить"}
          aria-label={isClosingRequired ? "Подвести итог" : "Отправить"}
        >
          <SendIcon />
        </button>
      </form>
    );
  } else {
    composer = (
      <div className={cn("voice-composer", isRecording && "is-recording")}>
        <button
          type="button"
          className={cn("record-button", isRecording && "recording")}
          onClick={onToggleRecording}
          disabled={isTranscribing || isPaused || inputLocked}
          title={isRecording ? "Закончить запись и распознать" : "Начать запись"}
          aria-label={isRecording ? "Закончить запись и распознать" : "Начать запись"}
          aria-pressed={isRecording}
        >
          <MicBadge />
        </button>

        {isRecording ? (
          <>
            <div className="recording-meter">
              <span className="recording-time"><i />{recordingTime}</span>
              <div className="waveform" aria-hidden="true">
                {bars.map((height, index) => (
                  <i key={index} className={cn(index % 7 === 4 || index % 11 === 8 ? "accent" : undefined)} style={{ height: `${height}px` }} />
                ))}
              </div>
            </div>
            <button type="button" className="cancel-recording" onClick={onCancelRecording} title="Отменить запись" aria-label="Отменить запись">
              <svg viewBox="0 0 40 35" fill="none" aria-hidden="true">
                <path d="M3 3 37 32M37 3 3 32" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </button>
          </>
        ) : (
          <div className="voice-prompt" role="status">
            <strong>{isTranscribing ? "Распознаём речь" : isClosingRequired ? "Подведите итог" : "Ваш ход"}</strong>
            <p>
              {isTranscribing ? "Текст появится здесь —\nего можно будет исправить"
                : "Нажмите на микрофон и говорите\nили переключитесь на текст"}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className={cn("meeting-stage", hintVisible && "is-backgrounded")}>
      <div className="stage-meta">
        <span className="role-chip"><ProfileIcon />Директор завода · AI-контрагент</span>
        <span className={cn("recording-chip", isRecording && !isPaused && "active", isFinished && !isSpeaking && "calm")} role="status">
          <i />
          {statusText}
        </span>
      </div>

      <div className="counterparty-scene">
        <div className={cn("counterparty-avatar", isSpeaking && !isPaused && "is-speaking")} aria-label="AI-контрагент">
          <CounterpartyAvatar />
        </div>
      </div>

      <article className="current-reply" aria-live="polite">
        <strong>Директор завода</strong>
        <p>{latestAssistantMessage}</p>
      </article>

      <div className="composer-wrap">
        <div className="composer-toolbar">
          <div className={cn("input-mode", inputLocked && "is-locked")} role="group" aria-label="Режим ввода">
            <button type="button" className={cn(inputMode === "voice" && "active")} aria-pressed={inputMode === "voice"} disabled={inputLocked || isRecording} onClick={() => setInputMode("voice")}>Голос</button>
            <button type="button" className={cn(inputMode === "text" && "active")} aria-pressed={inputMode === "text"} disabled={inputLocked || isRecording} onClick={() => setInputMode("text")}>Текст</button>
          </div>
          {inputMode === "text" && showDraft && !inputLocked && (
            <p className="composer-shortcut">Enter — отправить · Shift + Enter — новая строка</p>
          )}
          {toolbarChip && (
            <span className={cn("toolbar-chip", toolbarChip.tone === "calm" && "calm")}><i />{toolbarChip.text}</span>
          )}
          {showHintButton && (
            <button type="button" className="hint-action" aria-haspopup="dialog" onClick={() => onOpenDialog("hint")} disabled={isFinished || isPaused || isTranscribing || isSending}>
              Подсказка
            </button>
          )}
        </div>

        {composer}
      </div>
    </section>
  );
}
