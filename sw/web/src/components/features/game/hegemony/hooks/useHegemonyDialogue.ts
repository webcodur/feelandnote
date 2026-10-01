/*
  파일명: components/features/game/hegemony/hooks/useHegemonyDialogue.ts
  기능: 인물 대사
  책임: 선발 후보에 붙은 인물별 대사·음성 정보를 공용 대사 시스템에 넘기고, 카드 한 장으로 대사를 부르게 한다.
*/
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { BattleCard } from "@/lib/game/types";
import type { DialogueLines, DialogueType } from "@/lib/game/voice/types";
import { useDialogue } from "@/components/features/game/shared/hooks/useDialogue";
import { useGlobalDialogue } from "@/components/features/game/shared/providers/GlobalDialogueProvider";

export function useHegemonyDialogue(cards: readonly BattleCard[], sfxMuted: boolean) {
  const { handleSubtitle } = useGlobalDialogue();
  const sfxMutedRef = useRef(sfxMuted);
  useEffect(() => {
    sfxMutedRef.current = sfxMuted;
  }, [sfxMuted]);

  const maps = useMemo(() => {
    const personalDialogues = new Map<string, DialogueLines>();
    const voiceCelebIds = new Set<string>();
    const voiceVersions = new Map<string, number>();
    const voiceSpeeds = new Map<string, number>();
    for (const card of cards) {
      if (card.dialogueLines) personalDialogues.set(card.id, card.dialogueLines);
      if (card.hasVoice) voiceCelebIds.add(card.id);
      if (card.hasVoice && card.voiceV) voiceVersions.set(card.id, card.voiceV);
      if (card.voiceSpeed && card.voiceSpeed !== 1) voiceSpeeds.set(card.id, card.voiceSpeed);
    }
    return { personalDialogues, voiceCelebIds, voiceVersions, voiceSpeeds };
  }, [cards]);

  const { showDialogue } = useDialogue({ sfxMutedRef, onSubtitle: handleSubtitle, ...maps });

  const say = useCallback(
    (card: BattleCard, type: DialogueType) =>
      showDialogue(card.id, card.speechTone, type, { nickname: card.nickname, avatarUrl: card.avatarUrl }),
    [showDialogue],
  );
  // 다음 라운드로 넘어가면 앞 라운드 대사를 거둔다. 자막은 화면 아래에 떠서 손패와 출전 단추를 가린다
  const hush = useCallback(() => handleSubtitle(null), [handleSubtitle]);
  return useMemo(() => ({ say, hush }), [say, hush]);
}

export type SayLine = ReturnType<typeof useHegemonyDialogue>["say"];
