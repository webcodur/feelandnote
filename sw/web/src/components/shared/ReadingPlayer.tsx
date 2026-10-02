/*
  파일명: /components/shared/ReadingPlayer.tsx
  기능: 낭독이 붙는 읽기 블록 — 전문 본문 또는 미리보기·전문 모달
  책임: 인물 안내·가상독백을 선택한 형태로 표시하며 음원이 있을 때 조작바를 연다.
        음원이 있으면 재생 문장 강조·건너뛰기를 바깥 미리보기와 모달이 나눠 쓴다.
        nested는 다른 모달(신화·세력 인물 모달) 안에서 쓸 때 위에 띄우기 위한 값이다.
*/ // ------------------------------

"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useReadingTiming } from "@/hooks/useReadingTiming";
import { activeReadingSegment } from "@/lib/reading-timing";
import { useReadingNarration } from "@/hooks/useReadingNarration";
import ReviewScrollBox from "@/components/features/user/contentLibrary/expand/ReviewScrollBox";
import ContentTextModal from "@/components/ui/ContentTextModal";
import ReadingHighlightText from "@/components/shared/ReadingHighlightText";
import VirtualMonologueModal from "@/components/shared/VirtualMonologueModal";
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
  openLabel: string;
  displayMode?: "preview" | "full" | "desktop-full";
  /** 다른 모달 위에서 전문 모달을 열 때 — 위에 띄우고 ESC가 바깥 모달까지 닫지 않게 한다 */
  nested?: boolean;
}

export default function ReadingPlayer({ text, audioUrl, timingKind, celebId, voiceV = 0, readingLocale, openLabel, displayMode = "preview", nested = false }: ReadingPlayerProps) {
  const t = useTranslations("celebPage");
  const [textOpen, setTextOpen] = useState(false);
  const closeText = useCallback(() => setTextOpen(false), []);
  const narration = useReadingNarration(audioUrl);
  const { available, status, currentTime, duration, play, seek } = narration;
  const timing = useReadingTiming(celebId, readingLocale, voiceV, text, duration, available, timingKind);
  const sentence = activeReadingSegment(timing, currentTime, status);
  const mark = sentence ? { start: sentence.textStart, end: sentence.textEnd } : null;
  // 모달 본문에서 문장을 누르면 그 시점으로 건너뛰어 재생한다
  const playFrom = (seconds: number) => { seek(seconds); play(); };

  const fullText = (
    <div className={`mx-auto max-w-3xl text-[15px] leading-loose text-text-secondary break-keep md:text-base ${timingKind === "monologue" ? "font-serif" : ""}`}>
      <ReadingHighlightText
        text={text}
        mark={mark}
        segments={timing?.segments}
        onPlayFrom={available ? playFrom : undefined}
        sentenceLabel={t("readingPlayFromHere")}
      />
    </div>
  );

  if (displayMode === "full") {
    return (
      <div className="py-5 md:py-6">
        {available && <ReadingNarrationControls narration={narration} />}
        {fullText}
      </div>
    );
  }

  return (
    <div>
      {available && <ReadingNarrationControls narration={narration} />}
      {displayMode === "desktop-full" && <div className="hidden md:block">{fullText}</div>}
      <div className={displayMode === "desktop-full" ? "md:hidden" : undefined}>
        <ReviewScrollBox onOpen={() => setTextOpen(true)} openLabel={openLabel}>
          <div className="mx-auto max-w-3xl space-y-4 font-serif text-[15px] leading-loose text-text-secondary break-keep md:text-base">
            <ReadingHighlightText text={text} mark={mark} />
          </div>
        </ReviewScrollBox>
      </div>
      {textOpen && timingKind === "monologue" && (
        <VirtualMonologueModal
          text={text} mark={mark} segments={timing?.segments} onPlayFrom={playFrom}
          status={status} currentTime={currentTime}
          notice={available ? <ReadingNarrationControls narration={narration} /> : undefined}
          nested={nested}
          onClose={closeText}
        />
      )}
      {textOpen && timingKind === "reading" && (
        <ContentTextModal
          isOpen onClose={closeText} title={t("personGuide")} text={text}
          mark={mark} segments={timing?.segments} onPlayFrom={playFrom}
          status={status} currentTime={currentTime}
          notice={available ? <ReadingNarrationControls narration={narration} /> : undefined}
          sentenceLabel={t("readingPlayFromHere")}
          nested={nested}
        />
      )}
    </div>
  );
}
