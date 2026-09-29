import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { initialMessages, openingMessage } from "@/data/lesson";
import { hintText, inferB3L2Opportunity, isVoiceHintCommand, nextHintLevel, resolveHintPolicy } from "@/lib/lesson-hints";
import { getAttempt, getAttemptPrefix, saveAttempt } from "@/services/attempt-storage";
import { useCounterpartyVoice } from "@/hooks/use-counterparty-voice";
import { requestAssistantReply, transcribeAudio } from "@/services/meeting-api";
import type { ChatMessage, CompletionState, DialogKind, SessionState } from "@/types/meeting";
import type { HintLevel, SessionEvent, StoredAttempt, HintUsage } from "@/types/reporting";

export const MIC_LEVEL_COUNT = 36;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function useMeetingSession() {
  const sessionIdRef = useRef(crypto.randomUUID());
  const startedAtRef = useRef(new Date().toISOString());
  const search = new URLSearchParams(window.location.search);
  const hintPolicy = resolveHintPolicy("B3-L2", search.get("mode") === "exam" ? "exam" : "lesson");
  const parentAttemptId = search.get("replayAttempt") || undefined;
  const replayFromTurnId = search.get("turn") || undefined;
  const parentAttempt = parentAttemptId ? getAttempt(parentAttemptId) : null;
  const replayPrefix = parentAttempt && replayFromTurnId
    ? getAttemptPrefix(parentAttempt, replayFromTurnId)
    : [];
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    (replayPrefix.length ? replayPrefix : initialMessages).map((message) => ({
      ...message,
      createdAt: message.createdAt || startedAtRef.current,
    })),
  );
  const [input, setInput] = useState("");
  const [hasTranscribedInput, setHasTranscribedInput] = useState(false);
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintLevel, setHintLevel] = useState<HintLevel | null>(null);
  const [currentHintText, setCurrentHintText] = useState("");
  const [completionState, setCompletionState] = useState<CompletionState>("ACTIVE");
  const [activeDialog, setActiveDialog] = useState<DialogKind | null>("intro");
  const [micLevels, setMicLevels] = useState<number[]>([]);
  const voice = useCounterpartyVoice((message) => setNotice(message));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const discardRecordingRef = useRef(false);
  const levelContextRef = useRef<AudioContext | null>(null);
  const levelFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLTextAreaElement | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const sessionStateRef = useRef<SessionState>("active");
  const completionStateRef = useRef<CompletionState>("ACTIVE");
  const completionReasonRef = useRef<StoredAttempt["completionReason"]>(undefined);
  const scenarioOutcomeRef = useRef("UNKNOWN");
  const messagesRef = useRef(messages);
  const currentOpportunityIdRef = useRef(
    (replayPrefix.length ? replayPrefix : initialMessages)
      .filter((message) => message.role === "assistant")
      .reduce((opportunityId, message) => inferB3L2Opportunity(message.content, opportunityId), "O1"),
  );
  const pendingReplyRef = useRef<{
    reply: ChatMessage;
    transcript: ChatMessage[];
    data: Awaited<ReturnType<typeof requestAssistantReply>>;
    wasClosing: boolean;
  } | null>(null);
  const pendingHintRequestRef = useRef(false);
  const lastReplyIdRef = useRef<string | null>(null);
  const hintFlowBusyRef = useRef(false);
  const isSendingRef = useRef(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const transcriptionAbortRef = useRef<AbortController | null>(null);
  const startingRecordingRef = useRef(false);
  const retryConnectionPendingRef = useRef(false);
  const hintsRef = useRef<HintUsage[]>([]);
  const initialEventTime = startedAtRef.current;
  const eventsRef = useRef<SessionEvent[]>([
    { id: crypto.randomUUID(), type: "LESSON_STARTED", occurredAt: initialEventTime },
    { id: crypto.randomUUID(), type: "PRACTICE_STARTED", occurredAt: initialEventTime },
    ...(parentAttemptId && replayFromTurnId
      ? [{ id: crypto.randomUUID(), type: "REPLAY_STARTED", occurredAt: initialEventTime, turnId: replayFromTurnId }]
      : []),
    ...(!replayPrefix.length
      ? [
        { id: crypto.randomUUID(), type: "OPPORTUNITY_CREATED", occurredAt: initialEventTime, turnId: "opening", opportunityId: "O1" },
        { id: crypto.randomUUID(), type: "AI_POSITION_EMITTED", occurredAt: initialEventTime, turnId: "opening", opportunityId: "O1" },
      ]
      : []),
  ]);

  useEffect(() => {
    if (!retryConnectionPendingRef.current || activeDialog || inputMode !== "text") return;
    const form = transcriptRef.current?.form;
    if (!form) return;
    retryConnectionPendingRef.current = false;
    form.requestSubmit();
  }, [activeDialog, inputMode]);

  function createAttempt(transcript = messages, endedAt?: string, finishReason?: StoredAttempt["finishReason"]): StoredAttempt {
    return {
      schemaVersion: 1,
      id: sessionIdRef.current,
      lessonId: "B3-L2",
      scenarioId: "SC-B3-L2-PLANT-PILOT",
      scenarioVersion: "1.0",
      rubricVersion: "B3-L2-rubric-1.0",
      startedAt: startedAtRef.current,
      endedAt,
      finishReason,
      transcript,
      events: eventsRef.current,
      hints: hintsRef.current,
      completionState: completionStateRef.current,
      completionReason: completionReasonRef.current,
      parentAttemptId,
      replayFromTurnId,
    };
  }

  function persistAttempt(transcript = messages, endedAt?: string, finishReason?: StoredAttempt["finishReason"]) {
    try {
      saveAttempt(createAttempt(transcript, endedAt, finishReason));
      return true;
    } catch {
      setNotice("Не удалось сохранить попытку в браузере. Проверьте свободное место и повторите завершение.");
      return false;
    }
  }

  function recordEvent(
    type: string,
    turnId?: string,
    opportunityId?: string,
    occurredAt = new Date().toISOString(),
    hint?: HintLevel,
    details?: SessionEvent["details"],
  ) {
    const id = crypto.randomUUID();
    const event: SessionEvent = {
      id,
      clientEventId: type.startsWith("USER_") || type === "SESSION_MANUAL_FINISH_CONFIRMED" ? id : undefined,
      type,
      occurredAt,
      turnId,
      opportunityId,
      hintLevel: hint,
      details,
    };
    eventsRef.current = [...eventsRef.current, event];
    return event;
  }

  useEffect(() => {
    persistAttempt(messages);
    // Persist the initial transcript before a reload or navigation can discard it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const latest = [...messagesRef.current].reverse().find((message) => message.role === "assistant");
    if (latest) voice.prefetch(latest.content);
    // Only the line shown behind the intro dialog needs to be ready in advance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.content || openingMessage,
    [messages],
  );

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages, isSending]);

  useEffect(() => () => {
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    chatAbortRef.current?.abort();
    transcriptionAbortRef.current?.abort();
    stopLevelMeter();
  }, []);

  function stopLevelMeter() {
    if (levelFrameRef.current !== null) window.cancelAnimationFrame(levelFrameRef.current);
    levelFrameRef.current = null;
    void levelContextRef.current?.close().catch(() => undefined);
    levelContextRef.current = null;
  }

  function startLevelMeter(stream: MediaStream) {
    stopLevelMeter();
    setMicLevels([]);
    try {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      levelContextRef.current = context;
      const samples = new Float32Array(analyser.fftSize);
      let lastPush = 0;
      const tick = (time: number) => {
        levelFrameRef.current = window.requestAnimationFrame(tick);
        if (time - lastPush < 90 || sessionStateRef.current !== "active") return;
        lastPush = time;
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        const level = Math.min(1, Math.sqrt(sum / samples.length) * 6);
        setMicLevels((levels) => [...levels.slice(-(MIC_LEVEL_COUNT - 1)), level]);
      };
      levelFrameRef.current = window.requestAnimationFrame(tick);
    } catch {
      // The waveform is decorative; recording works without Web Audio.
    }
  }

  function isSessionActive() {
    return sessionStateRef.current === "active";
  }

  function resetRecordingResources() {
    stopLevelMeter();
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  async function transcribeRecording(blob: Blob) {
    if (sessionStateRef.current === "finished") return;
    const controller = new AbortController();
    transcriptionAbortRef.current = controller;
    setIsTranscribing(true);
    setNotice(null);

    try {
      const data = await transcribeAudio(blob, controller.signal);
      if (controller.signal.aborted) return;
      if (hintPolicy && isVoiceHintCommand(data.text, hintPolicy)) {
        requestHint();
        return;
      }
      setHasTranscribedInput(Boolean(data.text.trim()));
      setInput((current) => [current.trim(), data.text.trim()].filter(Boolean).join(" "));
      window.setTimeout(() => {
        if (sessionStateRef.current === "active") transcriptRef.current?.focus();
      }, 0);
    } catch (error) {
      if (controller.signal.aborted) return;
      setNotice(error instanceof Error ? error.message : "Не удалось распознать речь");
    } finally {
      transcriptionAbortRef.current = null;
      setIsTranscribing(false);
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function startRecording() {
    if (startingRecordingRef.current || !isSessionActive() || voice.isSpeaking) return;
    setNotice(null);

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setNotice("Браузер не поддерживает запись с микрофона.");
      return;
    }

    startingRecordingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!isSessionActive()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;

      const preferredTypes = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48_000 } : undefined);
      audioChunksRef.current = [];
      discardRecordingRef.current = false;
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        resetRecordingResources();
        if (sessionStateRef.current === "finished") return;
        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          return;
        }
        if (audioBlob.size > 0) void transcribeRecording(audioBlob);
        else setNotice("Запись получилась пустой. Проверьте микрофон.");
      });
      recorder.addEventListener("error", () => {
        resetRecordingResources();
        if (sessionStateRef.current !== "finished") setNotice("Браузер не смог записать звук.");
      });

      recorder.start(250);
      startLevelMeter(stream);
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        if (recorder.state !== "recording") return;
        setRecordingSeconds((seconds) => {
          if (seconds >= 28) window.setTimeout(stopRecording, 0);
          return seconds + 1;
        });
      }, 1000);
    } catch (error) {
      resetRecordingResources();
      if (sessionStateRef.current === "finished") return;
      setNotice(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Разрешите доступ к микрофону в настройках браузера."
          : "Не удалось подключить микрофон.",
      );
    } finally {
      startingRecordingRef.current = false;
    }
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
      return;
    }
    if (!isTranscribing && !isPaused && !isFinished && !voice.isSpeaking) void startRecording();
  }

  function cancelRecording() {
    if (!isRecording) return;
    discardRecordingRef.current = true;
    stopRecording();
  }

  function updateCompletionState(next: CompletionState, reason?: StoredAttempt["completionReason"]) {
    completionStateRef.current = next;
    if (reason) completionReasonRef.current = reason;
    setCompletionState(next);
  }

  function commitAssistantReply(pending: NonNullable<typeof pendingReplyRef.current>) {
    if (sessionStateRef.current === "finished") return;
    const { reply, transcript, data, wasClosing } = pending;
    const updatedMessages = [...transcript, reply];
    const priorOpportunityId = currentOpportunityIdRef.current;
    const opportunityId = data.opportunityId || inferB3L2Opportunity(reply.content, priorOpportunityId);
    const userTurnId = transcript.at(-1)?.id;
    if (wasClosing) {
      recordEvent("AI_CLOSING_REPLY", reply.id, opportunityId, reply.createdAt);
      updateCompletionState("EVALUATING");
      recordEvent("EVALUATION_STARTED", reply.id, opportunityId);
    } else {
      recordEvent("OPPORTUNITY_RESOLVED", userTurnId, priorOpportunityId);
      recordEvent("AI_TURN_EMITTED", reply.id, opportunityId, reply.createdAt);
      if (opportunityId !== priorOpportunityId) {
        recordEvent("OPPORTUNITY_CREATED", reply.id, opportunityId, reply.createdAt);
        recordEvent("AI_POSITION_EMITTED", reply.id, opportunityId, reply.createdAt);
      }
      recordEvent("COMPLETION_CHECKED", reply.id, opportunityId, undefined, undefined, {
        policy_version: data.policyVersion || "B3-L2-completion-1.0",
        valid_opportunity_count: data.validOpportunityCount ?? 0,
        scenario_outcome: data.scenarioOutcome || "UNKNOWN",
        result: data.completionState || "ACTIVE",
      });
    }
    currentOpportunityIdRef.current = opportunityId;
    if (!wasClosing && data.scenarioOutcome && data.scenarioOutcome !== "UNKNOWN") scenarioOutcomeRef.current = data.scenarioOutcome;
    messagesRef.current = updatedMessages;
    setMessages(updatedMessages);
    lastReplyIdRef.current = reply.id;
    void voice.speak(reply.id, reply.content);

    if (wasClosing || data.completionState === "COMPLETED") {
      const endedAt = new Date().toISOString();
      setHintVisible(false);
      updateCompletionState("COMPLETED", wasClosing ? completionReasonRef.current : "RESISTANCE");
      recordEvent("PRACTICE_ENDED", reply.id, opportunityId, endedAt);
      recordEvent("SESSION_COMPLETED", reply.id, opportunityId, endedAt, undefined, {
        completion_reason: completionReasonRef.current || "GOAL_COMPLETE",
        scenario_outcome: scenarioOutcomeRef.current,
      });
      sessionStateRef.current = "finished";
      setIsFinished(true);
      persistAttempt(updatedMessages, endedAt, "system");
    } else if (data.completionState === "CLOSING_REQUIRED") {
      setHintVisible(false);
      updateCompletionState("CLOSING_REQUIRED", data.completionReason || "GOAL_COMPLETE");
      recordEvent("CLOSING_REQUESTED", reply.id, opportunityId, undefined, undefined, {
        completion_reason: data.completionReason || "GOAL_COMPLETE",
      });
      persistAttempt(updatedMessages);
    } else {
      persistAttempt(updatedMessages);
    }

    if (pendingHintRequestRef.current) {
      if (completionStateRef.current === "ACTIVE") deliverHintRequest();
      else {
        pendingHintRequestRef.current = false;
        hintFlowBusyRef.current = false;
        setNotice("Встреча перешла к итогу, поэтому подсказка уже недоступна.");
      }
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    const wasClosing = completionStateRef.current === "CLOSING_REQUIRED";
    if (!content || isSendingRef.current || !isSessionActive() || voice.isSpeaking ||
      (completionStateRef.current !== "ACTIVE" && !wasClosing)) return;

    const previousMessages = messagesRef.current;
    const previousEvents = eventsRef.current;
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...previousMessages, userMessage];
    recordEvent(wasClosing ? "USER_CLOSING_ACTION" : "USER_UTTERANCE_FINALIZED", userMessage.id, currentOpportunityIdRef.current);
    if (wasClosing) updateCompletionState("CLOSING_REPLY");
    messagesRef.current = nextMessages;
    persistAttempt(nextMessages);
    setMessages(nextMessages);
    setInput("");
    setHasTranscribedInput(false);
    isSendingRef.current = true;
    setIsSending(true);
    setNotice(null);
    const controller = new AbortController();
    chatAbortRef.current = controller;

    try {
      const data = await requestAssistantReply(nextMessages, controller.signal, {
        phase: wasClosing ? "CLOSING_REQUIRED" : "ACTIVE",
        clientEventId: userMessage.id,
      });
      if (controller.signal.aborted) return;
      if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("Сервер вернул пустую реплику. Повторите действие.");
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
      };
      const pending = { reply, transcript: nextMessages, data, wasClosing };
      if (sessionStateRef.current === "paused") pendingReplyRef.current = pending;
      else commitAssistantReply(pending);
    } catch (error) {
      if (controller.signal.aborted) return;
      eventsRef.current = previousEvents;
      messagesRef.current = previousMessages;
      setMessages(previousMessages);
      setInput(content);
      if (wasClosing) updateCompletionState("CLOSING_REQUIRED");
      persistAttempt(previousMessages);
      // The connection dialog explains the failure; a second banner would cover the header.
      setActiveDialog("connection");
    } finally {
      chatAbortRef.current = null;
      isSendingRef.current = false;
      setIsSending(false);
    }
  }

  function pauseSession() {
    if (sessionStateRef.current === "finished") return;
    sessionStateRef.current = "paused";
    setIsPaused(true);
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.pause();
    voice.pause();
    mediaStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = false; });
  }

  function resumeSession() {
    if (sessionStateRef.current === "finished") return;
    sessionStateRef.current = "active";
    setIsPaused(false);
    mediaStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = true; });
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "paused") recorder.resume();
    voice.resume();
    const reply = pendingReplyRef.current;
    pendingReplyRef.current = null;
    if (reply) commitAssistantReply(reply);
  }

  function openDialog(kind: DialogKind) {
    if (sessionStateRef.current === "finished") return;
    if (kind === "hint") {
      requestHint();
      return;
    }
    if (kind === "pause" || kind === "finish") pauseSession();
    setActiveDialog(kind);
  }

  function dismissDialog() {
    if (activeDialog === "intro") {
      const latest = [...messagesRef.current].reverse().find((message) => message.role === "assistant");
      if (latest && sessionStateRef.current === "active") void voice.speak(latest.id, latest.content);
    }
    if (activeDialog === "pause" || activeDialog === "finish") resumeSession();
    if (activeDialog === "hint") hintFlowBusyRef.current = false;
    setActiveDialog(null);
  }

  function retryConnection() {
    if (sessionStateRef.current === "finished") return;
    if (sessionStateRef.current === "paused") resumeSession();
    retryConnectionPendingRef.current = true;
    setNotice(null);
    setInputMode("text");
    setActiveDialog(null);
  }

  function switchToTextAfterError() {
    if (sessionStateRef.current === "finished") return;
    if (sessionStateRef.current === "paused") resumeSession();
    retryConnectionPendingRef.current = false;
    setNotice(null);
    setInputMode("text");
    setActiveDialog(null);
    window.setTimeout(() => transcriptRef.current?.focus(), 0);
  }

  function finishSession() {
    if (sessionStateRef.current === "finished") return sessionIdRef.current;
    const endedAt = new Date().toISOString();
    const transcript = messagesRef.current;
    const previousEvents = eventsRef.current;
    recordEvent("PRACTICE_END_REQUESTED", transcript.at(-1)?.id, undefined, endedAt);
    recordEvent("SESSION_MANUAL_FINISH_CONFIRMED", transcript.at(-1)?.id, undefined, endedAt);
    recordEvent("PRACTICE_ENDED", transcript.at(-1)?.id, undefined, endedAt);
    recordEvent("SESSION_COMPLETED", transcript.at(-1)?.id, undefined, endedAt, undefined, {
      completion_reason: "MANUAL",
      scenario_outcome: scenarioOutcomeRef.current,
    });
    const previousCompletionState = completionStateRef.current;
    const previousCompletionReason = completionReasonRef.current;
    updateCompletionState("COMPLETED", "MANUAL");
    if (!persistAttempt(transcript, endedAt, "manual")) {
      eventsRef.current = previousEvents;
      completionReasonRef.current = previousCompletionReason;
      updateCompletionState(previousCompletionState);
      return null;
    }
    sessionStateRef.current = "finished";
    chatAbortRef.current?.abort();
    transcriptionAbortRef.current?.abort();
    pendingReplyRef.current = null;
    voice.stop();
    discardRecordingRef.current = true;
    stopRecording();
    resetRecordingResources();
    setIsSending(false);
    setIsTranscribing(false);
    setIsPaused(false);
    setIsFinished(true);
    setActiveDialog(null);
    return sessionIdRef.current;
  }

  function deliverHintRequest() {
    pendingHintRequestRef.current = false;
    if (completionStateRef.current !== "ACTIVE" || sessionStateRef.current === "finished") {
      hintFlowBusyRef.current = false;
      return;
    }
    setNotice(null);
    try {
      if (localStorage.getItem("negotiation-arena:hint-disclosure:v1") === "seen") {
        revealHint();
        return;
      }
    } catch {
      // Hint display still works if browser storage is unavailable.
    }
    setActiveDialog("hint");
  }

  function requestHint() {
    if (!hintPolicy?.enabled || completionStateRef.current !== "ACTIVE" || voice.isSpeaking ||
      sessionStateRef.current !== "active" || hintFlowBusyRef.current) return;
    hintFlowBusyRef.current = true;
    const latest = messagesRef.current.at(-1);
    recordEvent("USER_HINT_REQUEST", latest?.id, currentOpportunityIdRef.current);
    persistAttempt(messagesRef.current);
    if (isSendingRef.current) {
      pendingHintRequestRef.current = true;
      setNotice("Подсказка появится после ответа директора.");
      return;
    }
    deliverHintRequest();
  }

  function revealHint() {
    if (!hintPolicy || completionStateRef.current !== "ACTIVE" || sessionStateRef.current === "finished") return;
    const level = nextHintLevel(hintsRef.current.length);
    const occurredAt = new Date().toISOString();
    const opportunityId = currentOpportunityIdRef.current;
    const text = hintText(hintPolicy, level, opportunityId);
    const hint: HintUsage = {
      id: crypto.randomUUID(),
      level,
      occurredAt,
      afterTurnId: messagesRef.current.at(-1)?.id,
      opportunityId,
      text,
    };
    hintsRef.current = [...hintsRef.current, hint];
    recordEvent("HINT_SHOWN", hint.afterTurnId, opportunityId, occurredAt, level);
    setHintVisible(true);
    setHintLevel(level);
    setCurrentHintText(text);
    setBriefOpen(false);
    hintFlowBusyRef.current = false;
    try { localStorage.setItem("negotiation-arena:hint-disclosure:v1", "seen"); } catch { /* optional */ }
    persistAttempt(messagesRef.current);
  }

  function closeHint() {
    setHintVisible(false);
  }

  function copyHintToDraft() {
    if (hintLevel !== 3 || inputMode !== "text" || !hintVisible) return;
    setInput((current) => current.trim() ? `${current.trim()}\n${currentHintText}` : currentHintText);
    setHintVisible(false);
    window.setTimeout(() => transcriptRef.current?.focus(), 0);
  }

  return {
    sessionId: sessionIdRef.current,
    messages,
    input,
    setInput: (value: string) => {
      setInput(value);
      if (!value.trim()) setHasTranscribedInput(false);
    },
    hasTranscribedInput,
    inputMode,
    setInputMode,
    isSending,
    isRecording,
    isTranscribing,
    isSpeaking: voice.isSpeaking,
    // A new reply joins the transcript panel once the director has finished saying it.
    speakingMessageId: voice.speakingId && voice.speakingId === lastReplyIdRef.current ? voice.speakingId : null,
    micLevels,
    recordingSeconds,
    isPaused,
    isFinished,
    briefOpen,
    setBriefOpen,
    notice,
    clearNotice: () => setNotice(null),
    hintVisible,
    hintsAvailable: Boolean(hintPolicy?.enabled),
    hintLevel,
    currentHintText,
    closeHint,
    copyHintToDraft,
    completionState,
    revealHint,
    activeDialog,
    conversationRef,
    transcriptRef,
    latestAssistantMessage,
    recordingTime: formatTime(recordingSeconds),
    toggleRecording,
    cancelRecording,
    sendMessage,
    openDialog,
    dismissDialog,
    retryConnection,
    switchToTextAfterError,
    finishSession,
  };
}
