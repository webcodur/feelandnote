"use client";

import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";
import { getReadingVoiceUrl, getVirtualMonologueVoiceUrl } from "@/lib/game/voice/voiceUrl";
import ReadingPlayer from "@/components/shared/ReadingPlayer";

interface Props {
  kind: "guide" | "monologue";
  reading: CelebBySlugProfile["reading"];
  virtualMonologue: string | null;
  celebId: string;
  voiceV?: number;
  readingLocale: Locale;
  /** The language of the displayed monologue also selects its recording. */
  monologueLocale: Locale;
}

export default function FigureReadingSection(props: Props) {
  const isGuide = props.kind === "guide";
  const text = (isGuide ? props.reading?.guide : props.virtualMonologue)?.trim() ?? "";
  if (!text) return null;

  const locale = isGuide ? props.readingLocale : props.monologueLocale;
  const voiceV = props.voiceV ?? 0;
  const audioUrl = isGuide
    ? getReadingVoiceUrl(props.celebId, locale, voiceV)
    : getVirtualMonologueVoiceUrl(props.celebId, locale, voiceV);

  return (
    <ReadingPlayer
      key={`${props.celebId}:${locale}:${voiceV}:${props.kind}:${text}`}
      text={text}
      audioUrl={audioUrl}
      timingKind={isGuide ? "reading" : "monologue"}
      celebId={props.celebId}
      readingLocale={locale}
      voiceV={voiceV}
    />
  );
}
