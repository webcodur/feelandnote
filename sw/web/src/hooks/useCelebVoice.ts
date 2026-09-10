"use client";

import { useCallback, useState } from "react";
import {
  useDialogueSubtitle,
  type DialogueLabel,
} from "@/components/features/game/shared/hooks/useDialogue";
import { useCelebGreeting, type GreetingCeleb } from "@/hooks/useCelebGreeting";
import { trackEvent } from "@/lib/analytics/track";
import type { Locale } from "@/types/locale";

export interface UseCelebVoiceArgs {
  profile: GreetingCeleb;
  greeting?: string[] | null;
  nickname: string;
  locale: Locale;
}

/** 상세 페이지·셀럽 모달이 공유하는 인사말/한마디 재생 상태와 동작. */
export function useCelebVoice({ profile, greeting, nickname, locale }: UseCelebVoiceArgs) {
  const { handleSubtitle: setSubtitle, voiceMuted } = useDialogueSubtitle();
  const { fireGreeting, fireQuote } = useCelebGreeting({
    onSubtitle: setSubtitle,
    locale,
  });
  const [voicePlayback, setVoicePlayback] = useState<DialogueLabel | null>(null);

  const hasVoice = profile.has_voice ?? false;
  const hasGreetingLine = (greeting?.length ?? 0) > 0;
  const canGreet = hasGreetingLine;
  const hasGreetingAudio = hasVoice && hasGreetingLine;
  const isVoiceActive = voicePlayback !== null;
  const isQuoteActive = voicePlayback === "quotes";

  const handleVoiceStart = useCallback((label: DialogueLabel) => {
    setVoicePlayback(label);
  }, []);

  const handleVoiceEnd = useCallback(() => {
    setVoicePlayback(null);
  }, []);

  const stopVoice = useCallback(() => {
    setVoicePlayback(null);
    setSubtitle(null);
  }, [setSubtitle]);

  const handleGreetingPlay = useCallback(() => {
    if (isVoiceActive) {
      stopVoice();
      return;
    }

    if (hasGreetingAudio && !voiceMuted) {
      setVoicePlayback("greeting");
      trackEvent("celeb_voice_play", { kind: "greeting" });
    }
    fireGreeting(
      { ...profile, greeting, nickname },
      { onAudioStart: handleVoiceStart, onAudioEnd: handleVoiceEnd },
    );
  }, [
    fireGreeting,
    greeting,
    handleVoiceEnd,
    handleVoiceStart,
    hasGreetingAudio,
    isVoiceActive,
    nickname,
    profile,
    stopVoice,
    voiceMuted,
  ]);

  const handleQuotePlay = useCallback(() => {
    if (isVoiceActive) {
      stopVoice();
      return;
    }

    if (!voiceMuted) {
      setVoicePlayback("quotes");
      trackEvent("celeb_voice_play", { kind: "quote" });
    }
    fireQuote(
      { ...profile, greeting, nickname },
      { onAudioStart: handleVoiceStart, onAudioEnd: handleVoiceEnd },
    );
  }, [
    fireQuote,
    greeting,
    handleVoiceEnd,
    handleVoiceStart,
    isVoiceActive,
    nickname,
    profile,
    stopVoice,
    voiceMuted,
  ]);

  return {
    voiceMuted,
    hasVoice,
    hasGreetingLine,
    canGreet,
    hasGreetingAudio,
    isVoiceActive,
    isQuoteActive,
    handleGreetingPlay,
    handleQuotePlay,
    stopVoice,
  };
}
