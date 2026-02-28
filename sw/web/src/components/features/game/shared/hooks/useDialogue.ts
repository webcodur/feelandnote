/*
  파일명: components/features/game/shared/hooks/useDialogue.ts
  기능: 인물 대사 표시 훅
  책임: 개인별 고유 대사 → 공통 대사 폴백으로 대사 텍스트를 선택하고 자막 콜백으로 전달한다.
*/
"use client";

import { useCallback, useRef } from "react";
import type { SpeechTone, DialogueType, DialogueLines } from "@/lib/game/voice/types";
import { VARIANTS_PER_LINE } from "@/lib/game/voice/types";
import defaultLinesData from "@/lib/game/voice/defaultLines";

/** [emotion, ...] 태그를 제거하고 순수 대사 텍스트만 반환 */
export function stripEmotionTag(text: string): string {
  return text.replace(/^\[.*?\]\s*/, "");
}

export interface DialogueSubtitleData {
  key: number;
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
  const keyCounter = useRef(0);

  const showDialogue = useCallback((celebId: string, tone: SpeechTone, type: DialogueType, meta?: DialogueCharacterMeta) => {
    if (sfxMutedRef.current) return;
    if (!onSubtitle) return;

    const index = Math.floor(Math.random() * VARIANTS_PER_LINE);

    const personal = personalDialogues?.get(celebId);
    const raw = personal?.[type]?.[index];

    if (raw) {
      onSubtitle({
        key: ++keyCounter.current,
        tone,
        text: stripEmotionTag(raw),
        nickname: meta?.nickname,
        avatarUrl: meta?.avatarUrl,
      });
      return;
    }

    // 개인 대사 없으면 defaultLines 폴백
    const fallback = defaultLinesData[type]?.[tone];
    if (fallback?.length) {
      onSubtitle({
        key: ++keyCounter.current,
        tone,
        text: fallback[Math.floor(Math.random() * fallback.length)],
        nickname: meta?.nickname,
        avatarUrl: meta?.avatarUrl,
      });
    }
  }, [sfxMutedRef, onSubtitle, personalDialogues]);

  /** defaultLines 기반 범용 대사 표시. DB 개인화 불필요한 상황용. */
  const showDefaultLine = useCallback((tone: SpeechTone, key: string, meta?: DialogueCharacterMeta) => {
    if (sfxMutedRef.current) return;

    const lines = defaultLinesData[key]?.[tone];
    if (!lines?.length || !onSubtitle) return;

    const raw = lines[Math.floor(Math.random() * lines.length)];
    onSubtitle({
      key: Date.now(),
      tone,
      text: raw,
      nickname: meta?.nickname,
      avatarUrl: meta?.avatarUrl,
    });
  }, [sfxMutedRef, onSubtitle]);

  return { showDialogue, showDefaultLine };
}
