/*
  파일명: components/features/game/shared/hooks/useDialogue.ts
  기능: 인물 대사 표시 훅
  책임: 개인별 고유 대사 → 공통 대사 폴백으로 대사 텍스트를 선택하고 자막 콜백으로 전달한다.
*/
"use client";

import { useState, useCallback, useRef } from "react";
import { useLocale } from "next-intl";
import type { SpeechTone, DialogueType, DialogueLines } from "@/lib/game/voice/types";
import { VARIANTS_PER_LINE } from "@/lib/game/voice/types";
import defaultLinesData from "@/lib/game/voice/defaultLines";
import { getVoiceUrl } from "@/lib/game/voice/voiceUrl";

/** [emotion, ...] 태그를 제거하고 순수 대사 텍스트만 반환 */
export function stripEmotionTag(text: string): string {
  return text.replace(/^\[.*?\]\s*/, "");
}

/** 대사 종류 라벨 */
export type DialogueLabel = "greeting" | "roll_call" | "deploy" | "quotes";

export interface DialogueSubtitleData {
  key: number;
  tone: SpeechTone;
  text: string;
  nickname?: string;
  avatarUrl?: string | null;
  /** 음성 URL — 있으면 DialogueSubtitle에서 재생하고 끝날 때까지 UI를 유지한다 */
  audioUrl?: string | null;
  /** 대사 종류 (UI 라벨 표시용) */
  label?: DialogueLabel;
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
  /** 음성 보유 인물 ID Set */
  voiceCelebIds?: Set<string>;
  /** 인물별 voice_v Map (CDN 캐시 버스터) */
  voiceVersions?: Map<string, number>;
}

import { useGlobalDialogue } from "@/components/features/game/shared/providers/GlobalDialogueProvider";

/** 대사 자막 상태 + 콜백을 묶은 간편 훅. CelebCard → DialogueSubtitle 연결용. */
export function useDialogueSubtitle() {
  return useGlobalDialogue();
}

export function useDialogue({ sfxMutedRef, onSubtitle, personalDialogues, voiceCelebIds, voiceVersions }: UseDialogueOptions) {
  const keyCounter = useRef(0);
  const locale = useLocale() as 'ko' | 'en';
  /** 직전 사용 인덱스 기록 (키: "celebId:type" 또는 "default:key:tone") */
  const lastIndexRef = useRef<Map<string, number>>(new Map());

  /** count 개 중 lastIdx를 제외하고 랜덤 선택 */
  const pickAvoidLast = (count: number, mapKey: string): number => {
    const last = lastIndexRef.current.get(mapKey);
    if (count <= 1) { lastIndexRef.current.set(mapKey, 0); return 0; }
    let idx: number;
    do { idx = Math.floor(Math.random() * count); } while (idx === last);
    lastIndexRef.current.set(mapKey, idx);
    return idx;
  };

  const showDialogue = useCallback((celebId: string, tone: SpeechTone, type: DialogueType, meta?: DialogueCharacterMeta) => {
    if (sfxMutedRef.current) return;
    if (!onSubtitle) return;

    const mapKey = `${celebId}:${type}`;
    const index = pickAvoidLast(VARIANTS_PER_LINE, mapKey);

    const personal = personalDialogues?.get(celebId);
    const raw = personal?.[type]?.[index];

    if (raw) {
      const hasVoice = voiceCelebIds?.has(celebId);
      onSubtitle({
        key: ++keyCounter.current,
        tone,
        text: stripEmotionTag(raw),
        nickname: meta?.nickname,
        avatarUrl: meta?.avatarUrl,
        audioUrl: hasVoice ? getVoiceUrl(celebId, locale, type, index + 1, voiceVersions?.get(celebId)) : null,
        label: type as DialogueLabel,
      });
      return;
    }

    // 개인 대사 없으면 defaultLines 폴백
    const fallback = defaultLinesData[locale][type]?.[tone];
    if (fallback?.length) {
      const fbKey = `default:${type}:${tone}`;
      const fbIdx = pickAvoidLast(fallback.length, fbKey);
      onSubtitle({
        key: ++keyCounter.current,
        tone,
        text: fallback[fbIdx],
        nickname: meta?.nickname,
        avatarUrl: meta?.avatarUrl,
        label: type as DialogueLabel,
      });
    }
  }, [sfxMutedRef, onSubtitle, personalDialogues, voiceCelebIds, voiceVersions, locale]);

  /** defaultLines 기반 범용 대사 표시. DB 개인화 불필요한 상황용. */
  const showDefaultLine = useCallback((tone: SpeechTone, key: string, meta?: DialogueCharacterMeta) => {
    if (sfxMutedRef.current) return;

    const lines = defaultLinesData[locale][key]?.[tone];
    if (!lines?.length || !onSubtitle) return;

    const mapKey = `default:${key}:${tone}`;
    const raw = lines[pickAvoidLast(lines.length, mapKey)];
    onSubtitle({
      key: Date.now(),
      tone,
      text: raw,
      nickname: meta?.nickname,
      avatarUrl: meta?.avatarUrl,
    });
  }, [sfxMutedRef, onSubtitle, locale]);

  return { showDialogue, showDefaultLine };
}
