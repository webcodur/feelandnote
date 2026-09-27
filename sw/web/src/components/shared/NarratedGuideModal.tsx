/*
  파일명: /components/shared/NarratedGuideModal.tsx
  기능: 낭독 음원이 붙는 인물 안내 읽기 모달
  책임: 신화의 세계·세력도감 인물 모달의 「인물 안내」 단추가 여는 전문 읽기 창.
        audioUrl이 비면 음원 없는 안내라 조작부가 저절로 비활성 표시된다. 닫히면 낭독도 함께 언마운트되어 멈춘다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { useReadingNarration } from "@/hooks/useReadingNarration";
import { useReadingTiming } from "@/hooks/useReadingTiming";
import { activeReadingSegment } from "@/lib/reading-timing";
import ContentTextModal from "@/components/ui/ContentTextModal";
import ReadingNarrationControls from "@/components/shared/ReadingNarrationControls";
import type { Locale } from "@/types/locale";

interface Props {
  celebId: string;
  /** 안내 본문과 같은 텍스트를 읽는 reading.mp3 URL — 글만 있는 안내(소개문 fallback 등)는 빈 문자열 */
  audioUrl: string;
  /** 본문이 실제로 쓰인 언어 — 음원·타이밍 파일 경로를 고른다 */
  readingLocale: Locale;
  text: string;
  voiceV?: number;
  nested?: boolean;
  onClose: () => void;
}

export default function NarratedGuideModal({ celebId, audioUrl, readingLocale, text, voiceV = 0, nested, onClose }: Props) {
  const t = useTranslations("celebPage");
  const narration = useReadingNarration(audioUrl);
  const { available, status, currentTime, duration, play, seek } = narration;
  const timing = useReadingTiming(celebId, readingLocale, voiceV, text, duration, available, "reading");
  const sentence = activeReadingSegment(timing, currentTime, status);
  const mark = sentence ? { start: sentence.textStart, end: sentence.textEnd } : null;
  // 모달 본문에서 문장을 누르면 그 시점으로 건너뛰어 재생한다
  const playFrom = (seconds: number) => { seek(seconds); play(); };

  return (
    <ContentTextModal
      isOpen
      onClose={onClose}
      title={t("personGuide")}
      text={text}
      mark={mark}
      segments={timing?.segments}
      onPlayFrom={playFrom}
      status={status}
      currentTime={currentTime}
      notice={<ReadingNarrationControls narration={narration} />}
      sentenceLabel={t("readingPlayFromHere")}
      nested={nested}
    />
  );
}
