/*
  파일명: /components/features/faction/entry/FactionDescVoice.tsx
  기능: 세력도감 테마 개요 본문 + 낭독 조작
  책임: 타이밍 JSON이 발행된 테마는 개요 위에 낭독 조작(재생·탐색·배속)을 얹고
        본문은 재생 문장 강조·문장 눌러 재생으로 바꿔 친다(신화 개요와 같은 음성 규칙).
        음원이 없거나 타이밍이 본문과 어긋나면 평문 단락만 보인다 — 화면은 그대로다.
*/ // ------------------------------

"use client";

import { useTranslations } from "next-intl";
import ReadingHighlightText from "@/components/shared/ReadingHighlightText";
import ReadingNarrationControls from "@/components/shared/ReadingNarrationControls";
import { FormattedText, splitReadableParagraphs } from "@/components/ui";
import { useFactionDescVoice } from "@/hooks/useFactionDescVoice";
import { useReadingNarration } from "@/hooks/useReadingNarration";
import { activeReadingSegment } from "@/lib/reading-timing";
import type { Locale } from "@/types/locale";

interface FactionDescVoiceProps {
  factionId: string;
  locale: Locale;
  /** 화면 언어로 고른 개요 원문 — 타이밍 sourceHash 대조에도 쓴다 */
  text: string;
}

export default function FactionDescVoice({ factionId, locale, text }: FactionDescVoiceProps) {
  const tCeleb = useTranslations("celebPage");
  const paragraphs = splitReadableParagraphs(text);

  /* 개요 낭독 — 신화 개요(MythOverview)와 같은 조합이다. 짧은 개요라 본문 자리에서
     문장을 강조하고 문장을 눌러 그 시점부터 재생한다 — 별도 모달은 두지 않는다 */
  const descVoice = useFactionDescVoice(factionId, locale, text);
  const narration = useReadingNarration(descVoice?.audioUrl ?? "");
  const timing = descVoice?.timing && narration.duration > 0
    && Math.abs(descVoice.timing.duration - narration.duration) <= 0.15 ? descVoice.timing : null;
  const sentence = activeReadingSegment(timing, narration.currentTime, narration.status);
  const mark = sentence ? { start: sentence.textStart, end: sentence.textEnd } : null;
  const playFrom = (seconds: number) => { narration.seek(seconds); narration.play(); };

  if (!paragraphs.length) return null;

  return (
    <div className="mt-4">
      {descVoice && (
        <div className="mb-4">
          <ReadingNarrationControls narration={narration} />
        </div>
      )}
      {descVoice ? (
        <div className="break-keep text-sm leading-7 text-text-secondary md:text-[15px] md:leading-8">
          <ReadingHighlightText
            text={text}
            mark={mark}
            segments={timing?.segments}
            onPlayFrom={playFrom}
            sentenceLabel={tCeleb("readingPlayFromHere")}
          />
        </div>
      ) : (
        <div className="space-y-5 break-keep text-sm leading-7 text-text-secondary md:text-[15px] md:leading-8">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>
              <FormattedText text={paragraph} />
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
