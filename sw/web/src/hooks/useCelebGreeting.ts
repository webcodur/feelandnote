/*
  파일명: /hooks/useCelebGreeting.ts
  기능: 셀럽 greeting 대사 발사 + 클릭 ripple 효과
  책임: 인물카드 반복 클릭 시 중복 회피하며 랜덤 대사를 발사하고,
        클릭 지점에 ripple 시각 효과를 제공한다.
*/ // ------------------------------

import { useRef, useCallback, useState } from "react";
import type { DialogueSubtitleData, DialogueLabel } from "@/components/features/game/shared/hooks/useDialogue";
import { stripEmotionTag } from "@/components/features/game/shared/hooks/useDialogue";
import defaultLinesData from "@/lib/game/voice/defaultLines";
import type { SpeechTone } from "@/lib/game/voice/types";
import { getVoiceUrl, getQuoteVoiceUrl } from "@/lib/game/voice/voiceUrl";

/** fireGreeting에 전달할 셀럽 최소 인터페이스 */
export interface GreetingCeleb {
  id: string;
  nickname: string;
  avatar_url?: string | null;
  greeting?: string[] | null;
  greeting_en?: string[] | null;
  roll_call?: string[] | null;
  roll_call_en?: string[] | null;
  deploy?: string[] | null;
  deploy_en?: string[] | null;
  quotes?: string | null;
  quotes_en?: string | null;
  speech_tone?: string | null;
  has_voice?: boolean;
}

interface UseCelebGreetingOptions {
  onSubtitle?: (data: DialogueSubtitleData) => void;
  locale: "ko" | "en";
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

  /** greeting + roll_call + deploy + quote 슬롯에서 균등 확률로 발사 (직전 중복 회피) */
  const fireGreeting = useCallback(
    (celeb: GreetingCeleb) => {
      if (!onSubtitle) return;

      const pick = <T,>(ko: T | undefined | null, en: T | undefined | null): T | null =>
        (locale === "ko" ? ko : (en ?? ko)) ?? null;

      const greetings = pick(celeb.greeting, celeb.greeting_en) as string[] | null;
      const rollCalls = pick(celeb.roll_call, celeb.roll_call_en) as string[] | null;
      const deploys = pick(celeb.deploy, celeb.deploy_en) as string[] | null;
      const displayQuote = pick(celeb.quotes, celeb.quotes_en) as string | null;

      // 모든 대사가 없으면 defaultLines 폴백
      if (!greetings?.length && !rollCalls?.length && !deploys?.length && !displayQuote) {
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

      type Slot = { label: DialogueLabel; text: string; voiceType?: string; voiceIdx?: number };
      const slots: Slot[] = [];
      greetings?.forEach((t, i) => slots.push({ label: "greeting", text: stripEmotionTag(t), voiceType: "greeting", voiceIdx: i + 1 }));
      rollCalls?.forEach((t, i) => slots.push({ label: "roll_call", text: stripEmotionTag(t), voiceType: "roll_call", voiceIdx: i + 1 }));
      deploys?.forEach((t, i) => slots.push({ label: "deploy", text: stripEmotionTag(t), voiceType: "deploy", voiceIdx: i + 1 }));
      if (displayQuote) slots.push({ label: "quotes", text: displayQuote });

      if (slots.length === 0) return;

      const lastIdx = lastIdxMap.current.get(celeb.id) ?? null;
      let slot: number;
      if (slots.length <= 1) {
        slot = 0;
      } else {
        do { slot = Math.floor(Math.random() * slots.length); } while (slot === lastIdx);
      }
      lastIdxMap.current.set(celeb.id, slot);

      const picked = slots[slot];
      const audioUrl = picked.label === "quotes"
        ? (celeb.has_voice ? getQuoteVoiceUrl(celeb.id, locale) : null)
        : (celeb.has_voice && picked.voiceType ? getVoiceUrl(celeb.id, locale, picked.voiceType as any, picked.voiceIdx!) : null);

      onSubtitle({
        key: ++keyRef.current,
        tone: ((celeb.speech_tone as SpeechTone) ?? "composed"),
        text: picked.text,
        nickname: celeb.nickname,
        avatarUrl: celeb.avatar_url ?? null,
        audioUrl,
        label: picked.label,
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

  return { fireGreeting, ripple, triggerRipple, clearRipple };
}
