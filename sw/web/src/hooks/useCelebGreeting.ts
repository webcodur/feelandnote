/*
  파일명: /hooks/useCelebGreeting.ts
  기능: 셀럽 greeting 대사 발사 + 클릭 ripple 효과
  책임: 인물카드 반복 클릭 시 중복 회피하며 랜덤 대사를 발사하고,
        클릭 지점에 ripple 시각 효과를 제공한다.
*/ // ------------------------------

import { useRef, useCallback, useState } from "react";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";
import { stripEmotionTag } from "@/components/features/game/shared/hooks/useDialogue";
import defaultLinesData from "@/lib/game/voice/defaultLines";
import type { SpeechTone } from "@/lib/game/voice/types";
import { getVoiceUrl, getQuoteVoiceUrl } from "@/lib/game/voice/voiceUrl";
import type { Locale } from "@/types/locale";

/** fireGreeting에 전달할 셀럽 최소 인터페이스 */
export interface GreetingCeleb {
  id: string;
  nickname: string;
  avatar_url?: string | null;
  greeting?: string[] | null;
  greeting_en?: string[] | null;
  quotes?: string | null;
  quotes_en?: string | null;
  speech_tone?: string | null;
  has_voice?: boolean;
  voice_v?: number;
  voice_speed?: number;
}

interface UseCelebGreetingOptions {
  onSubtitle?: (data: DialogueSubtitleData) => void;
  locale: Locale;
}

export interface RippleData {
  id: string;
  x: number;
  y: number;
  key: number;
}

export function useCelebGreeting({ onSubtitle, locale }: UseCelebGreetingOptions) {
  const keyRef = useRef(0);
  const lastIdxMap = useRef<Map<string, number>>(new Map());

  // ripple 상태 (id로 어떤 카드인지 구분)
  const [ripple, setRipple] = useState<RippleData | null>(null);
  const rippleCounter = useRef(0);

  /** greeting + quote 슬롯에서 균등 확률로 발사 (직전 중복 회피) */
  const fireGreeting = useCallback(
    (celeb: GreetingCeleb) => {
      if (!onSubtitle) return;

      const greetings =
        locale === "ko"
          ? celeb.greeting
          : (celeb.greeting_en ?? celeb.greeting);

      const displayQuote = locale === "ko" ? celeb.quotes : (celeb.quotes_en ?? celeb.quotes);

      if (!greetings?.length) {
        if (celeb.speech_tone) {
          const fallback =
            defaultLinesData[locale].greeting?.[celeb.speech_tone as SpeechTone];
          if (fallback?.length) {
            onSubtitle({
              key: ++keyRef.current,
              tone: ((celeb.speech_tone as SpeechTone) ?? "composed"),
              text: fallback[Math.floor(Math.random() * fallback.length)],
              nickname: celeb.nickname,
              avatarUrl: celeb.avatar_url ?? null,
              label: "greeting",
            });
          }
        }
        return;
      }

      const slotCount = greetings.length + (displayQuote ? 1 : 0);
      const lastIdx = lastIdxMap.current.get(celeb.id) ?? null;
      let slot: number;
      if (slotCount <= 1) {
        slot = 0;
      } else {
        do { slot = Math.floor(Math.random() * slotCount); } while (slot === lastIdx);
      }
      lastIdxMap.current.set(celeb.id, slot);

      if (displayQuote && slot === greetings.length) {
        onSubtitle({
          key: ++keyRef.current,
          tone: ((celeb.speech_tone as SpeechTone) ?? "composed"),
          text: displayQuote,
          nickname: celeb.nickname,
          avatarUrl: celeb.avatar_url ?? null,
          audioUrl: celeb.has_voice ? getQuoteVoiceUrl(celeb.id, locale, celeb.voice_v) : null,
          label: "quotes",
          voiceSpeed: celeb.voice_speed,
        });
      } else {
        onSubtitle({
          key: ++keyRef.current,
          tone: ((celeb.speech_tone as SpeechTone) ?? "composed"),
          text: stripEmotionTag(greetings[slot]),
          nickname: celeb.nickname,
          avatarUrl: celeb.avatar_url ?? null,
          audioUrl:
            celeb.has_voice
              ? getVoiceUrl(celeb.id, locale, "greeting", slot + 1, celeb.voice_v)
              : null,
          label: "greeting",
          voiceSpeed: celeb.voice_speed,
        });
      }
    },
    [onSubtitle, locale],
  );

  /** quote만 단독 재생 */
  const fireQuote = useCallback(
    (celeb: GreetingCeleb) => {
      if (!onSubtitle) return;
      const displayQuote = locale === "ko" ? celeb.quotes : (celeb.quotes_en ?? celeb.quotes);
      if (!displayQuote) return;
      onSubtitle({
        key: ++keyRef.current,
        tone: ((celeb.speech_tone as SpeechTone) ?? "composed"),
        text: displayQuote,
        nickname: celeb.nickname,
        avatarUrl: celeb.avatar_url ?? null,
        audioUrl: celeb.has_voice ? getQuoteVoiceUrl(celeb.id, locale, celeb.voice_v) : null,
        label: "quotes",
        voiceSpeed: celeb.voice_speed,
      });
    },
    [onSubtitle, locale],
  );

  /** 클릭 지점에 ripple 발사 (celeb id로 어떤 카드인지 구분) */
  const triggerRipple = useCallback(
    (celebId: string, e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setRipple({ id: celebId, x, y, key: ++rippleCounter.current });
    },
    [],
  );

  const clearRipple = useCallback(() => setRipple(null), []);

  return { fireGreeting, fireQuote, ripple, triggerRipple, clearRipple };
}
