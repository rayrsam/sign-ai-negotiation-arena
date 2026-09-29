import { useCallback, useEffect, useRef, useState } from "react";
import { synthesizeSpeech } from "@/services/meeting-api";

const START_TIMEOUT_MS = 15_000;

interface VoiceJob {
  id: string;
  controller: AbortController;
  audio: HTMLAudioElement | null;
  url: string | null;
  timeout: number | null;
  finish: () => void;
}

/**
 * Plays the counterparty's replies through SpeechKit TTS.
 * While a reply is being voiced `speakingId` holds its message id; the text stays
 * visible as subtitles, so a failed synthesis never blocks the conversation.
 */
export function useCounterpartyVoice(onError: (message: string) => void) {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const jobRef = useRef<VoiceJob | null>(null);
  const pausedRef = useRef(false);
  const cacheRef = useRef(new Map<string, Promise<Blob>>());
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const loadSpeech = useCallback((text: string, signal?: AbortSignal) => {
    const cached = cacheRef.current.get(text);
    if (cached) return cached;
    const promise = synthesizeSpeech(text, signal ?? new AbortController().signal);
    cacheRef.current.set(text, promise);
    promise.catch(() => cacheRef.current.delete(text));
    if (cacheRef.current.size > 8) cacheRef.current.delete(cacheRef.current.keys().next().value!);
    return promise;
  }, []);

  const releaseJob = useCallback((job: VoiceJob) => {
    if (job.timeout !== null) window.clearTimeout(job.timeout);
    job.controller.abort();
    if (job.audio) {
      job.audio.onended = null;
      job.audio.onerror = null;
      job.audio.pause();
      job.audio.removeAttribute("src");
    }
    if (job.url) URL.revokeObjectURL(job.url);
    if (jobRef.current === job) {
      jobRef.current = null;
      setSpeakingId(null);
    }
  }, []);

  const stop = useCallback(() => {
    const job = jobRef.current;
    if (job) {
      releaseJob(job);
      job.finish();
    }
  }, [releaseJob]);

  const startPlayback = useCallback((job: VoiceJob) => {
    if (!job.audio || pausedRef.current || jobRef.current !== job) return;
    job.audio.play().catch((error: unknown) => {
      if (jobRef.current !== job) return;
      // Autoplay can be blocked until the user interacts with the page; the subtitles remain.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        releaseJob(job);
        job.finish();
      }
    });
  }, [releaseJob]);

  const speak = useCallback((id: string, text: string) => new Promise<void>((resolve) => {
    stop();
    const content = text.trim();
    if (!content) {
      resolve();
      return;
    }

    const job: VoiceJob = {
      id,
      controller: new AbortController(),
      audio: null,
      url: null,
      timeout: null,
      finish: resolve,
    };
    jobRef.current = job;
    setSpeakingId(id);

    job.timeout = window.setTimeout(() => {
      if (jobRef.current === job && !pausedRef.current && (!job.audio || job.audio.currentTime === 0)) {
        releaseJob(job);
        job.finish();
      }
    }, START_TIMEOUT_MS);

    loadSpeech(content, job.controller.signal)
      .then((blob) => {
        if (jobRef.current !== job) return;
        job.url = URL.createObjectURL(blob);
        const audio = new Audio(job.url);
        audio.preload = "auto";
        job.audio = audio;
        audio.onended = () => {
          releaseJob(job);
          job.finish();
        };
        audio.onerror = () => {
          releaseJob(job);
          job.finish();
          onErrorRef.current("Не удалось воспроизвести голос директора. Реплика показана текстом.");
        };
        startPlayback(job);
      })
      .catch((error: unknown) => {
        if (jobRef.current !== job) return;
        releaseJob(job);
        job.finish();
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          onErrorRef.current("Не удалось озвучить реплику директора. Текст реплики доступен на экране.");
        }
      });
  }), [loadSpeech, releaseJob, startPlayback, stop]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    jobRef.current?.audio?.pause();
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    const job = jobRef.current;
    if (job) startPlayback(job);
  }, [startPlayback]);

  const prefetch = useCallback((text: string) => {
    if (text.trim()) void loadSpeech(text.trim()).catch(() => undefined);
  }, [loadSpeech]);

  useEffect(() => () => {
    const job = jobRef.current;
    if (job) releaseJob(job);
  }, [releaseJob]);

  return { speakingId, isSpeaking: speakingId !== null, speak, pause, resume, stop, prefetch };
}
