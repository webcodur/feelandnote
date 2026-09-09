"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/types/locale";

type Status = "idle" | "loading" | "playing" | "paused";

/** Prerecorded reading first; browser speech is a fallback for unavailable files. */
export function useReadingNarration(url: string, sentences: string[], locale: Locale) {
  const [status, setStatus] = useState<Status>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const generationRef = useRef(0);
  const speechRef = useRef(false);
  const pausedRef = useRef(false);

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (!audio) return;
    audio.onplaying = audio.onended = audio.onerror = null;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }, []);

  const cleanup = useCallback(() => {
    generationRef.current += 1;
    releaseAudio();
    if (speechRef.current) window.speechSynthesis?.cancel();
    speechRef.current = false;
    pausedRef.current = false;
    utteranceRef.current = null;
  }, [releaseAudio]);

  const reset = useCallback(() => {
    setStatus("idle");
    setActiveIndex(-1);
  }, []);

  const stop = useCallback(() => {
    cleanup();
    reset();
  }, [cleanup, reset]);

  // The owner keys this hook's component by source; remount cancels pending playback.
  useEffect(() => cleanup, [cleanup]);

  useEffect(() => {
    if (status !== "playing") return;
    const timer = window.setInterval(() => {
      if (!speechRef.current || pausedRef.current) return;
      const synth = window.speechSynthesis;
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [status]);

  const play = useCallback(() => {
    cleanup();
    const generation = generationRef.current;
    const current = () => generation === generationRef.current;
    if (!sentences.length) return;
    setActiveIndex(-1);
    setStatus("loading");

    const fallback = () => {
      if (!current() || speechRef.current) return;
      releaseAudio();
      // A failed download while paused must wait for the next explicit resume.
      if (pausedRef.current) return;
      if (!("speechSynthesis" in window)) {
        reset();
        return;
      }
      const synth = window.speechSynthesis;
      speechRef.current = true;
      synth.cancel();
      const voice = synth.getVoices().find((item) =>
        item.lang.toLowerCase().replace("_", "-").startsWith(locale),
      );
      const speakAt = (index: number) => {
        if (!current()) return;
        if (index >= sentences.length) {
          speechRef.current = false;
          utteranceRef.current = null;
          reset();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(sentences[index]);
        utteranceRef.current = utterance;
        utterance.lang = locale === "en" ? "en-US" : "ko-KR";
        if (voice) utterance.voice = voice;
        utterance.onstart = () => {
          if (!current()) return;
          setActiveIndex(index);
          setStatus(pausedRef.current ? "paused" : "playing");
        };
        utterance.onend = () => speakAt(index + 1);
        utterance.onerror = () => {
          if (current()) stop();
        };
        synth.speak(utterance);
      };
      setStatus("playing");
      speakAt(0);
    };

    if (typeof Audio === "undefined" || !url) {
      fallback();
      return;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onplaying = () => {
      if (current() && !pausedRef.current) setStatus("playing");
    };
    audio.onended = () => {
      if (current()) stop();
    };
    audio.onerror = fallback;
    void audio.play().catch((error: unknown) => {
      // pause/stop can reject a pending play; that must never start fallback speech.
      if (!current() || pausedRef.current) return;
      if (error instanceof DOMException && error.name === "AbortError") return;
      fallback();
    });
  }, [cleanup, locale, releaseAudio, reset, sentences, stop, url]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    if (audioRef.current) audioRef.current.pause();
    else if (speechRef.current) window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    const audio = audioRef.current;
    if (audio) {
      const generation = generationRef.current;
      setStatus("loading");
      void audio.play().catch((error: unknown) => {
        if (generation !== generationRef.current || pausedRef.current) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        play();
      });
    } else if (speechRef.current) {
      window.speechSynthesis.resume();
      setStatus("playing");
    } else {
      play();
    }
  }, [play]);

  return { status, activeIndex, play, pause, resume, stop };
}
