/*
  파일명: components/features/game/shared/hooks/useDialogue.ts
  기능: 인물 대사 표시 훅
  책임: 개인별 고유 대사 → 공통 대사 폴백으로 대사 텍스트를 선택하고 자막 콜백으로 전달한다.
*/
"use client";

import { useCallback } from "react";
import type { SpeechTone, DialogueType, DialogueLines } from "@/lib/game/voice/types";
import { VARIANTS_PER_LINE } from "@/lib/game/voice/types";
import { VOICE_TEMPLATES } from "@/lib/game/voice/voiceLines";

/** [emotion, ...] 태그를 제거하고 순수 대사 텍스트만 반환 */
export function stripEmotionTag(text: string): string {
  return text.replace(/^\[.*?\]\s*/, "");
}

export interface DialogueSubtitleData {
  tone: SpeechTone;
  text: string;
  nickname?: string;
  avatarUrl?: string | null;
}

/** showDialogue 호출 시 자막에 표시할 캐릭터 정보 */
export interface DialogueCharacterMeta {
  nickname: string;
  avatarUrl: string | null;
}

interface UseDialogueOptions {
  /** sfxMuted ref — useGameAudio와 동일 뮤트 상태 연동 */
  sfxMutedRef: React.RefObject<boolean>;
  /** 자막 콜백 — 대사 표시 시 텍스트 전달 */
  onSubtitle?: (sub: DialogueSubtitleData) => void;
  /** 인물별 고유 대사 Map */
  personalDialogues?: Map<string, DialogueLines>;
}

export function useDialogue({ sfxMutedRef, onSubtitle, personalDialogues }: UseDialogueOptions) {
  const showDialogue = useCallback((celebId: string, tone: SpeechTone, type: DialogueType, meta?: DialogueCharacterMeta) => {
    if (sfxMutedRef.current) return;

    const index = Math.floor(Math.random() * VARIANTS_PER_LINE);

    // 1순위: 개인별 고유 대사
    const personal = personalDialogues?.get(celebId);
    let raw = personal?.[type]?.[index];

    // 2순위: 공통 대사 폴백
    if (!raw) {
      raw = VOICE_TEMPLATES[tone]?.[type]?.[index];
    }

    if (raw && onSubtitle) {
      onSubtitle({
        tone,
        text: stripEmotionTag(raw),
        nickname: meta?.nickname,
        avatarUrl: meta?.avatarUrl,
      });
    }
  }, [sfxMutedRef, onSubtitle, personalDialogues]);

  return { showDialogue };
}
