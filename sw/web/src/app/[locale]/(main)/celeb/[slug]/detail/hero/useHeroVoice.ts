/* ─────────────────────────────────────────────
 * [celeb 상세] hero — 음성·인사 인터랙션 훅
 * - 목차 위치: 머리말(본문 앞, 목차 밖)
 * - 데이터: profile/greeting/nickname/locale + useCelebGreeting 액션
 * - 함께 보기: HeroSectionContent.tsx, HeroPhoto.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useState } from "react";
import {
  useDialogueSubtitle,
  type DialogueLabel,
} from "@/components/features/game/shared/hooks/useDialogue";
import { useCelebGreeting } from "@/hooks/useCelebGreeting";
import { trackEvent } from "@/lib/analytics/track";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";

interface UseHeroVoiceArgs {
  profile: CelebBySlugProfile;
  greeting?: string[] | null;
  nickname: string;
  locale: Locale;
}

/* ── 1. 음성 상태 ── */
export function useHeroVoice({ profile, greeting, nickname, locale }: UseHeroVoiceArgs) {
  const {
    handleSubtitle: setSubtitle,
    voiceMuted,
  } = useDialogueSubtitle();
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

  /* ── 2. 인사 재생 ── */
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

  /* ── 3. 인용 재생 ── */
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
