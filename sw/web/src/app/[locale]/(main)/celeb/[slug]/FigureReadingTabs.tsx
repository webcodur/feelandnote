"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useReadingTiming } from "@/hooks/useReadingTiming";
import { activeReadingSegment } from "@/lib/reading-timing";
import { useTranslations } from "next-intl";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";
import { getReadingVoiceUrl, getVirtualMonologueVoiceUrl } from "@/lib/game/voice/voiceUrl";
import { useAudioAvailable, useReadingNarration } from "@/hooks/useReadingNarration";
import ReviewScrollBox from "@/components/features/user/contentLibrary/expand/ReviewScrollBox";
import ContentTextModal from "@/components/ui/ContentTextModal";
import ReadingHighlightText from "@/components/shared/ReadingHighlightText";
import VirtualMonologueModal from "@/components/shared/VirtualMonologueModal";
import ReadingNarrationControls from "@/components/shared/ReadingNarrationControls";

import ArchiveTabsHeader, { type ArchiveTabItem } from "./ArchiveTabsHeader";

type ReadingTab = "guide" | "monologue";

interface Props {
  reading: CelebBySlugProfile["reading"];
  /** 화면 언어로 고른 가상독백. 영문이 없으면 한국어가 온다 */
  virtualMonologue: string | null;
  celebId: string;
  voiceV?: number;
  readingLocale: Locale;
  /** 가상독백 본문이 실제로 쓰인 언어 — 표시 fallback과 따로 둔다 */
  monologueLocale: Locale;
}

/** Changing the person, language or source stops the previous recording. */
/** 음원이 실제로 올라간 모드는 탭 이름 뒤에 초록 배경이 맥박해 듣기 가능을 표시한다 */
function AudioTabLabel({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex items-center">
      <span
        aria-hidden
        className="absolute -inset-x-2 -inset-y-1 rounded-md bg-emerald-400/15 motion-safe:animate-pulse"
      />
      <span className="relative text-emerald-400">{children}</span>
    </span>
  );
}

export default function FigureReadingTabs(props: Props) {
  const t = useTranslations("celebPage");
  const [tab, setTab] = useState<ReadingTab>("guide");
  const guide = props.reading?.guide.trim() ?? "";
  const monologue = props.virtualMonologue?.trim() ?? "";
  const guideUrl = guide ? getReadingVoiceUrl(props.celebId, props.readingLocale, props.voiceV ?? 0) : "";
  const monologueUrl = monologue ? getVirtualMonologueVoiceUrl(props.celebId, props.monologueLocale, props.voiceV ?? 0) : "";
  const guideAudio = useAudioAvailable(guideUrl);
  const monologueAudio = useAudioAvailable(monologueUrl);
  if (!guide && !monologue) return null;

  const player = (
    <ReadingPlayer
      key={`${props.celebId}:${props.readingLocale}:${props.voiceV}:${props.reading?.guide}`}
      text={guide}
      audioUrl={guideUrl}
      timingKind="reading"
      celebId={props.celebId}
      readingLocale={props.readingLocale}
      voiceV={props.voiceV}
      openLabel={t("readingExpandGuide")}
    />
  );
  // 인물 안내·가상독백 모두 짧게 미리 보고, 눌러 전문을 읽는다.
  const monologueBox = (
    <ReadingPlayer
      key={`${props.celebId}:${props.monologueLocale}:${props.voiceV}:vmonologue:${monologue}`}
      text={monologue}
      audioUrl={monologueUrl}
      timingKind="monologue"
      celebId={props.celebId}
      readingLocale={props.monologueLocale}
      voiceV={props.voiceV}
      openLabel={t("readingExpandMonologue")}
    />
  );

  // 모드가 하나면 탭 없이 상자 윗변에서 글을 소폭 떼어 시작한다
  if (!guide || !monologue) {
    return <div className="pt-4 md:pt-6">{guide ? player : monologueBox}</div>;
  }

  const tabs: ArchiveTabItem<ReadingTab>[] = [
    { key: "guide", label: guideAudio ? <AudioTabLabel>{t("personGuide")}</AudioTabLabel> : t("personGuide") },
    { key: "monologue", label: monologueAudio ? <AudioTabLabel>{t("virtualMonologue")}</AudioTabLabel> : t("virtualMonologue") },
  ];
  return (
    <div>
      <ArchiveTabsHeader
        tabs={tabs}
        activeKey={tab}
        onChange={setTab}
        columnsClassName="grid-cols-2"
        ariaLabel={t("reading")}
      />
      <div id={`archive-panel-${tab}`} role="tabpanel" aria-labelledby={`archive-tab-${tab}`}>
        {tab === "guide" ? player : monologueBox}
      </div>
    </div>
  );
}

function ReadingPlayer({ text, audioUrl, timingKind, celebId, voiceV = 0, readingLocale, openLabel }: {
  text: string;
  audioUrl: string;
  timingKind: "reading" | "monologue";
  celebId: string;
  voiceV?: number;
  readingLocale: Locale;
  openLabel: string;
}) {
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

  return (
    <div>
      <ReadingNarrationControls narration={narration} />
      <ReviewScrollBox onOpen={() => setTextOpen(true)} openLabel={openLabel}>
        <div className="mx-auto max-w-3xl space-y-4 font-serif text-[15px] leading-loose text-text-secondary break-keep md:text-base">
          <ReadingHighlightText text={text} mark={mark} />
        </div>
      </ReviewScrollBox>
      {textOpen && timingKind === "monologue" && (
        <VirtualMonologueModal
          text={text} mark={mark} segments={timing?.segments} onPlayFrom={playFrom}
          status={status} currentTime={currentTime}
          notice={<ReadingNarrationControls narration={narration} />}
          onClose={closeText}
        />
      )}
      {textOpen && timingKind === "reading" && (
        <ContentTextModal
          isOpen onClose={closeText} title={t("personGuide")} text={text}
          mark={mark} segments={timing?.segments} onPlayFrom={playFrom}
          status={status} currentTime={currentTime}
          notice={<ReadingNarrationControls narration={narration} />}
          sentenceLabel={t("readingPlayFromHere")}
        />
      )}
    </div>
  );
}
