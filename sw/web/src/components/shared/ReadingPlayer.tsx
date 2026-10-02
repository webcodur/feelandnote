/*
  파일명: /components/shared/ReadingPlayer.tsx
  기능: 낭독이 붙는 읽기 블록 — 본문 전문 표시
  책임: 인물 안내·가상독백을 전문으로 표시하며 음원이 있을 때 조작바를 연다.
        재생 문장 강조와 문장 눌러 건너뛰기를 본문에서 바로 쓴다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import { useReadingTiming } from "@/hooks/useReadingTiming";
import { activeReadingSegment } from "@/lib/reading-timing";
import { useReadingNarration } from "@/hooks/useReadingNarration";
import ReadingHighlightText from "@/components/shared/ReadingHighlightText";
import ReadingNarrationControls from "@/components/shared/ReadingNarrationControls";
import type { Locale } from "@/types/locale";

interface ReadingPlayerProps {
  text: string;
  audioUrl: string;
  timingKind: "reading" | "monologue";
  celebId: string;
  voiceV?: number;
  /** 본문이 실제로 쓰인 언어 — 음원·타이밍 파일 경로를 고른다 */
  readingLocale: Locale;
}

export default function ReadingPlayer({ text, audioUrl, timingKind, celebId, voiceV = 0, readingLocale }: ReadingPlayerProps) {
  const t = useTranslations("celebPage");
  const narration = useReadingNarration(audioUrl);
  const { available, status, currentTime, duration, play, seek } = narration;
  const timing = useReadingTiming(celebId, readingLocale, voiceV, text, duration, available, timingKind);
  const sentence = activeReadingSegment(timing, currentTime, status);
  const mark = sentence ? { start: sentence.textStart, end: sentence.textEnd } : null;
  // 본문에서 문장을 누르면 그 시점으로 건너뛰어 재생한다
  const playFrom = (seconds: number) => { seek(seconds); play(); };

  return (
    <div className="py-5 md:py-6">
      {available && <ReadingNarrationControls narration={narration} />}
      <div className={`mx-auto max-w-3xl text-[15px] leading-loose text-text-secondary break-keep md:text-base ${timingKind === "monologue" ? "font-serif" : ""}`}>
        <ReadingHighlightText
          text={text}
          mark={mark}
          segments={timing?.segments}
          onPlayFrom={available ? playFrom : undefined}
          sentenceLabel={t("readingPlayFromHere")}
        />
      </div>
    </div>
  );
}
