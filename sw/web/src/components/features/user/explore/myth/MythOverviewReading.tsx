"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import ReadingNarrationControls from "@/components/shared/ReadingNarrationControls";
import ContentTextModal from "@/components/ui/ContentTextModal";
import type { FactionDescVoice } from "@/hooks/useFactionDescVoice";
import type { useReadingNarration } from "@/hooks/useReadingNarration";

interface Props {
  voice: FactionDescVoice | null;
  narration: ReturnType<typeof useReadingNarration>;
  text: string;
  title: string;
  onClose: () => void;
  notice?: ReactNode;
}

// 바깥 재생 버튼과 같은 재생기를 쓴다. 모달 개폐로 낭독 위치가 바뀌지 않는다.
export default function MythOverviewReading({ voice, narration, text, title, onClose, notice }: Props) {
  const t = useTranslations("celebPage");
  const timing = voice?.timing && narration.duration > 0
    && Math.abs(voice.timing.duration - narration.duration) <= 0.15 ? voice.timing : null;

  return (
    <ContentTextModal isOpen onClose={onClose} title={title} text={text}
      notice={<>{notice}{voice && <div className="mb-5"><ReadingNarrationControls narration={narration} /></div>}</>}
      segments={timing?.segments} status={narration.status} currentTime={narration.currentTime}
      onPlayFrom={(seconds) => { narration.seek(seconds); narration.play(); }}
      sentenceLabel={t("readingPlayFromHere")} />
  );
}
