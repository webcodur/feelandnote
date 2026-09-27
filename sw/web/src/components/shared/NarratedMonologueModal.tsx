/*
  파일명: /components/shared/NarratedMonologueModal.tsx
  기능: 낭독 음원이 붙는 가상독백 읽기 모달
  책임: 신화의 세계·세력도감 인물 모달에서 여는 가상독백에 재생 조작과 재생 문장 강조를 붙인다.
        음원이 없으면 조작부가 저절로 비활성 표시된다. 닫히면 낭독도 함께 언마운트되어 멈춘다.
*/ // ------------------------------

"use client";

import { getVirtualMonologueVoiceUrl } from "@/lib/game/voice/voiceUrl";
import { useReadingNarration } from "@/hooks/useReadingNarration";
import { useReadingTiming } from "@/hooks/useReadingTiming";
import { activeReadingSegment } from "@/lib/reading-timing";
import VirtualMonologueModal from "@/components/shared/VirtualMonologueModal";
import ReadingNarrationControls from "@/components/shared/ReadingNarrationControls";
import type { Locale } from "@/types/locale";

interface Props {
  celebId: string;
  /** 독백 본문이 실제로 쓰인 언어 — 음원·타이밍 파일 경로를 고른다 */
  locale: Locale;
  text: string;
  voiceV?: number;
  nested?: boolean;
  onClose: () => void;
}

export default function NarratedMonologueModal({ celebId, locale, text, voiceV = 0, nested, onClose }: Props) {
  const narration = useReadingNarration(getVirtualMonologueVoiceUrl(celebId, locale, voiceV));
  const { available, status, currentTime, duration, play, seek } = narration;
  const timing = useReadingTiming(celebId, locale, voiceV, text, duration, available, "monologue");
  const sentence = activeReadingSegment(timing, currentTime, status);
  const mark = sentence ? { start: sentence.textStart, end: sentence.textEnd } : null;
  // 모달 본문에서 문장을 누르면 그 시점으로 건너뛰어 재생한다
  const playFrom = (seconds: number) => { seek(seconds); play(); };

  return (
    <VirtualMonologueModal
      text={text} mark={mark} segments={timing?.segments} onPlayFrom={playFrom}
      status={status} currentTime={currentTime}
      notice={<ReadingNarrationControls narration={narration} />}
      nested={nested}
      onClose={onClose}
    />
  );
}
