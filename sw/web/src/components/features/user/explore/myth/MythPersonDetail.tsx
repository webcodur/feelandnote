"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { MythPerson, Myth } from "@/actions/home/mythTypes";
import { getFactionLongDescs, type FactionLongDescs } from "@/actions/home/getFactionLongDescs";
import { splitReadableParagraphs } from "@/components/ui/FormattedText";
import NarratedGuideModal from "@/components/shared/NarratedGuideModal";
import NarratedMonologueModal from "@/components/shared/NarratedMonologueModal";
import { useAudioAvailable } from "@/hooks/useReadingNarration";
import { useCelebVirtualMonologue } from "@/hooks/useCelebVirtualMonologue";
import { getReadingVoiceUrl, getVirtualMonologueVoiceUrl } from "@/lib/game/voice/voiceUrl";
import FactionPersonHeader from "@/components/features/faction/entry/FactionPersonHeader";
import FactionPersonBooks from "@/components/features/faction/entry/FactionPersonBooks";
import { FACTION_PERSON_LAYOUT as layout } from "@/components/features/faction/entry/factionPersonLayout";
import Modal from "@/components/ui/Modal";
import { mythLeadImage } from "./mythLeadImage";

interface Props {
  person: MythPerson;
  myth: Myth;
  onClose: () => void;
}

export default function MythPersonDetail({ person, myth, onClose }: Props) {
  const t = useTranslations("explore.hub.myth");
  const isEn = useLocale() === "en";
  const monologue = useCelebVirtualMonologue(person.id);
  const [guideOpen, setGuideOpen] = useState(false);
  const [monologueOpen, setMonologueOpen] = useState(false);
  /* 「이 신화에서의 역할」 섹션 — 테마별 긴 소개만 본문이 된다.
     한 줄 역할(short_desc)은 인물 정의와 겹쳐 읽혀 표기하지 않는다 */
  const [longDescs, setLongDescs] = useState<{ mythId: string; byCeleb: FactionLongDescs } | null>(null);
  useEffect(() => {
    let alive = true;
    getFactionLongDescs(myth.id)
      .then((byCeleb) => alive && setLongDescs({ mythId: myth.id, byCeleb }))
      .catch((error) => {
        console.error("[MythPersonDetail] 테마 소개 조회 실패:", error);
        if (alive) setLongDescs({ mythId: myth.id, byCeleb: {} });
      });
    return () => {
      alive = false;
    };
  }, [myth.id]);
  const desc = longDescs?.mythId === myth.id ? longDescs.byCeleb[person.id] : undefined;
  const contextDesc = ((isEn ? desc?.en : desc?.ko) ?? "").trim();
  /* 「인물 안내」는 버튼+모달 항목 — 안내가 없을 때만 짧은 소개(bio)가 모달 본문을 채운다.
     낭독 음원(reading.mp3)은 안내 본문을 읽으므로, 안내가 아닌 글에는 음원을 붙이지 않는다 */
  const guide = person.reading?.guide?.trim() ?? "";
  const guideLocale = person.reading?.locale ?? "ko";
  const guideText = guide || person.bio?.trim() || "";
  const guideAudioUrl = guide ? getReadingVoiceUrl(person.id, guideLocale, person.voiceV) : "";
  const monologueAudioUrl = monologue ? getVirtualMonologueVoiceUrl(person.id, monologue.locale, person.voiceV) : "";
  const guideAudio = useAudioAvailable(guideAudioUrl);
  const monologueAudio = useAudioAvailable(monologueAudioUrl);
  const group = myth.groups.find((item) => item.personIds.includes(person.id));

  return (
    <Modal isOpen onClose={onClose} ariaLabel={person.name} size="full" animateHeight={false} frame="plain" boxClassName={layout.modal}>
      <article className={layout.article}>
        <FactionPersonHeader nested person={person} factionName={myth.name} group={group?.name}
          portraitUrl={mythLeadImage(person, myth.id)}
          guide={guideText ? { onOpen: () => setGuideOpen(true), hasAudio: guideAudio } : undefined}
          monologue={monologue ? { onOpen: () => setMonologueOpen(true), hasAudio: monologueAudio } : undefined} />
        {contextDesc && (
          <section className={layout.body}>
            <h3 className="mb-3 text-lg font-bold text-text-primary">
              {t("personInTheme", { theme: myth.name, name: person.name })}
            </h3>
            <div className={layout.paragraphs}>
              {splitReadableParagraphs(contextDesc).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          </section>
        )}
        <FactionPersonBooks celebId={person.id} />
      </article>
      {guideOpen && guideText && (
        <NarratedGuideModal nested celebId={person.id} text={guideText} audioUrl={guideAudioUrl}
          readingLocale={guideLocale} voiceV={person.voiceV} onClose={() => setGuideOpen(false)} />
      )}
      {monologueOpen && monologue && (
        <NarratedMonologueModal nested celebId={person.id} text={monologue.text} locale={monologue.locale} voiceV={person.voiceV}
          onClose={() => setMonologueOpen(false)} />
      )}
    </Modal>
  );
}
