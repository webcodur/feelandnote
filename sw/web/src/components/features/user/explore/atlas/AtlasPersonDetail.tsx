"use client";

import { useId, useRef, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Myth, MythPerson } from "@/actions/home/mythTypes";
import type { CelebProfile } from "@/types/home";
import type { Locale } from "@/types/locale";
import type { AtlasWorld } from "../myth/atlasNavigationData";
import { mythLeadImage } from "../myth/mythLeadImage";
import Modal from "@/components/ui/Modal";
import AtlasNav, { type AtlasNavItem } from "@/components/shared/atlasNav/AtlasNav";
import HubSection from "@/components/shared/HubSection";
import FormattedText from "@/components/ui/FormattedText";
import NarratedGuideModal from "@/components/shared/NarratedGuideModal";
import NarratedMonologueModal from "@/components/shared/NarratedMonologueModal";
import FactionPersonHeader from "@/components/features/faction/entry/FactionPersonHeader";
import FactionPersonBooks from "@/components/features/faction/entry/FactionPersonBooks";
import FactionPersonReviews from "@/components/features/faction/entry/FactionPersonReviews";
import CelebShelfSection from "@/components/features/celeb/CelebShelfSection";
import { FACTION_PERSON_LAYOUT as layout } from "@/components/features/faction/entry/factionPersonLayout";
import { useContainerSectionNavigation } from "@/lib/scroll/useContainerSectionNavigation";
import { useAudioAvailable } from "@/hooks/useReadingNarration";
import { useCelebReadingGuide } from "@/hooks/useCelebReadingGuide";
import { useCelebVirtualMonologue } from "@/hooks/useCelebVirtualMonologue";
import { useCelebVoice } from "@/hooks/useCelebVoice";
import { getReadingVoiceUrl, getVirtualMonologueVoiceUrl } from "@/lib/game/voice/voiceUrl";

interface Props {
  mode: AtlasWorld;
  person: MythPerson;
  theme: Pick<Myth, "id" | "name">;
  profile?: CelebProfile;
  group?: string | null;
  onClose: () => void;
}

/** 두 도감과 인물 상세의 소속 목록이 같은 인물 소개 화면을 연다. */
export default function AtlasPersonDetail({ mode, person, theme, profile, group, onClose }: Props) {
  const t = useTranslations(mode === "myth" ? "explore.hub.myth" : "explore.faction");
  const tCeleb = useTranslations("celebPage");
  const locale = useLocale() as Locale;
  const [guideOpen, setGuideOpen] = useState(false);
  const [monologueOpen, setMonologueOpen] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const prefix = useId();
  const reality = profile?.celeb_reality ?? person.reality;
  const hasRecords = reality === "REAL" || reality === "BOTH";
  const items: AtlasNavItem[] = [
    { key: "profile", label: tCeleb("serviceIntroduction"), sectionId: `${prefix}-profile` },
    { key: "books", label: tCeleb("bookshelfTitle"), sectionId: `${prefix}-books` },
  ].map((item, index) => ({ ...item, chapter: String(index + 1).padStart(2, "0") }));
  const { activeSectionId, navigate } = useContainerSectionNavigation(items.map(item => item.sectionId), articleRef);
  const fetchedGuide = useCelebReadingGuide(person.id);
  const monologue = useCelebVirtualMonologue(person.id);
  const guide = person.reading ? { text: person.reading.guide, locale: person.reading.locale } : fetchedGuide;
  const guideText = guide?.text?.trim() || person.bio?.trim() || "";
  const voiceV = person.voiceV;
  const guideAudioUrl = guide?.text ? getReadingVoiceUrl(person.id, guide.locale, voiceV) : "";
  const monologueAudioUrl = monologue ? getVirtualMonologueVoiceUrl(person.id, monologue.locale, voiceV) : "";
  const guideAudio = useAudioAvailable(guideAudioUrl);
  const monologueAudio = useAudioAvailable(monologueAudioUrl);
  const greeting = locale === "en" ? profile?.greeting_en ?? profile?.greeting : profile?.greeting;
  const voice = useCelebVoice({ profile: profile ?? { id: person.id, nickname: person.name }, greeting, nickname: person.name, locale });
  const description = person.appearances.find(appearance => appearance.mythId === theme.id)?.summary?.trim();

  return (
    <Modal isOpen onClose={onClose} ariaLabel={person.name} fullScreen widthClassName="max-w-none"
      animateHeight={false} frame="plain" boxClassName="h-dvh overflow-hidden bg-bg-main"
      boxStyle={{ "--content-max-default": "56rem" } as CSSProperties}
      overlayClassName="w-screen bg-bg-main" scrollAreaClassName="flex-1 [overflow-anchor:none]">
      <AtlasNav items={items} activeId={activeSectionId} onNavigate={navigate} withinModal />
      <article ref={articleRef} className="mx-auto w-full max-w-[var(--content-max-default)] px-5 pt-12 pb-24 sm:px-7 md:px-8 md:pt-8 min-[1340px]:pb-10">
        <HubSection compact hideDivider id={items[0].sectionId} title={items[0].label} titleAs="h3"
          index={0} total={items.length} tabIndex={-1} className="scroll-mt-6 outline-none">
          <FactionPersonHeader person={person} factionName={theme.name} group={group} portraitUrl={mythLeadImage(person, theme.id)} nested centered
            guide={guideText ? { onOpen: () => setGuideOpen(true), hasAudio: guideAudio } : undefined}
            monologue={monologue ? { onOpen: () => setMonologueOpen(true), hasAudio: monologueAudio } : undefined}
            voice={voice.canGreet ? { hasVoice: voice.hasGreetingAudio, isVoicePlaying: voice.isVoiceActive,
              onGreet: voice.handleGreetingPlay, greetLabel: voice.hasGreetingAudio ? tCeleb("playGreetingVoice") : tCeleb("dialogue_greeting") } : undefined} />
          {description && <section className={layout.body}>
            <h3 className="mb-3 text-center text-lg font-bold text-text-primary">
              {t.rich("personInTheme", { theme: theme.name, name: person.name, accent: chunks => <span className="text-accent">{chunks}</span> })}
            </h3>
            <div className={`${layout.paragraphs} break-keep`}><FormattedText text={description} layout="prose" /></div>
          </section>}
        </HubSection>
        <HubSection compact id={items[items.length - 1].sectionId} title={items[items.length - 1].label} titleAs="h3"
          index={items.length - 1} total={items.length} tabIndex={-1} className="scroll-mt-6 outline-none">
          <CelebShelfSection key={`${person.id}:${locale}`} hasReviews={hasRecords}
            librarySlot={<FactionPersonReviews celebId={person.id} name={person.name} avatarUrl={person.avatarUrl} embedded />}
            booksSlot={<FactionPersonBooks celebId={person.id} embedded />} />
        </HubSection>
      </article>
      {guideOpen && guideText && <NarratedGuideModal nested celebId={person.id} text={guideText} audioUrl={guideAudioUrl}
        readingLocale={guide?.locale ?? locale} voiceV={voiceV} onClose={() => setGuideOpen(false)} />}
      {monologueOpen && monologue && <NarratedMonologueModal nested celebId={person.id} text={monologue.text}
        locale={monologue.locale} voiceV={voiceV} onClose={() => setMonologueOpen(false)} />}
    </Modal>
  );
}
