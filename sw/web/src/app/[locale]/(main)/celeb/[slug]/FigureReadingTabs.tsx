"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";
import { getReadingVoiceUrl, getVirtualMonologueVoiceUrl } from "@/lib/game/voice/voiceUrl";
import { useAudioAvailable } from "@/hooks/useReadingNarration";
import AudioAvailableLabel from "@/components/shared/AudioAvailableLabel";
import ReadingPlayer from "@/components/shared/ReadingPlayer";

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
    { key: "guide", label: guideAudio ? <AudioAvailableLabel>{t("personGuide")}</AudioAvailableLabel> : t("personGuide") },
    { key: "monologue", label: monologueAudio ? <AudioAvailableLabel>{t("virtualMonologue")}</AudioAvailableLabel> : t("virtualMonologue") },
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
