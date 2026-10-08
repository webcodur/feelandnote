/*
  파일명: /components/features/faction/entry/FactionMemberModal.tsx
  기능: 세력도감 인물 소개 모달
  책임: 카드를 누른 인물을 이 테마 안에서 소개한다 — 인물 상세와 같은 아바타 모듈(확대 보기·인사 음성), 테마·진영, 이름·직함,
        「인물 안내」·「가상독백」 낭독 항목, 테마 맥락 소개(「{테마}에서의 {이름}」), 공개 감상 기록과 관련 도서를 보여 준다.
        아바타·신원·항목 버튼을 머리말로 묶고, 테마 소개는 그 아래 제목 달린 섹션에서 읽는다.
*/ // ------------------------------

"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getFactionLongDescs, type FactionLongDescs } from "@/actions/home/getFactionLongDescs";
import NarratedGuideModal from "@/components/shared/NarratedGuideModal";
import NarratedMonologueModal from "@/components/shared/NarratedMonologueModal";
import Modal from "@/components/ui/Modal";
import { splitReadableParagraphs } from "@/components/ui/FormattedText";
import FactionPersonHeader from "./FactionPersonHeader";
import FactionPersonBooks from "./FactionPersonBooks";
import FactionPersonReviews from "./FactionPersonReviews";
import { FACTION_PERSON_LAYOUT as layout } from "./factionPersonLayout";
import { useAudioAvailable } from "@/hooks/useReadingNarration";
import { useCelebReadingGuide } from "@/hooks/useCelebReadingGuide";
import { useCelebVirtualMonologue } from "@/hooks/useCelebVirtualMonologue";
import { useCelebVoice } from "@/hooks/useCelebVoice";
import { getReadingVoiceUrl, getVirtualMonologueVoiceUrl } from "@/lib/game/voice/voiceUrl";
import type { CelebProfile } from "@/types/home";
import type { Locale } from "@/types/locale";

/** 이 테마 안에서의 인물 정보 — 서버가 명단에서 만들어 넘긴다 */
export interface FactionMemberMeta {
  group: string | null;
}

interface FactionMemberModalProps {
  factionId: string;
  /** 화면 언어의 테마 이름 */
  factionName: string;
  celeb: CelebProfile;
  meta: FactionMemberMeta | undefined;
  onClose: () => void;
  portraitUrl?: string | null;
}

export default function FactionMemberModal({ factionId, factionName, celeb, meta, onClose, portraitUrl }: FactionMemberModalProps) {
  const t = useTranslations("explore.faction");
  const tCeleb = useTranslations("celebPage");
  const locale = useLocale() as Locale;
  const isEn = locale === "en";
  const [longDescs, setLongDescs] = useState<{ factionId: string; byCeleb: FactionLongDescs } | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [monologueOpen, setMonologueOpen] = useState(false);
  // 가상독백·인물 안내 — 인물 단위로 따로 받는다. 없는 인물은 단추를 두지 않거나 fallback 글을 담는다
  const monologue = useCelebVirtualMonologue(celeb.id);
  const guide = useCelebReadingGuide(celeb.id);

  const name = (isEn && celeb.nickname_en) || celeb.nickname;
  const title = (isEn && celeb.title_en) || celeb.title;
  const greeting = isEn ? (celeb.greeting_en ?? celeb.greeting) : celeb.greeting;

  // 인물 상세·인물 상세 모달과 같은 인사 음성 재생 — 음성이 없으면 인사 대사 자막만 띄운다
  const { canGreet, hasGreetingAudio, isVoiceActive, handleGreetingPlay } = useCelebVoice({
    profile: celeb,
    greeting,
    nickname: name,
    locale,
  });

  /* 테마별 긴 소개 — 테마 단위로 캐시된 묶음에서 꺼내 「{테마}에서의 {이름}」 섹션 본문이 된다. */
  useEffect(() => {
    let alive = true;
    getFactionLongDescs(factionId)
      .then((byCeleb) => alive && setLongDescs({ factionId, byCeleb }))
      .catch((error) => {
        console.error("[FactionMemberModal] 긴 소개 조회 실패:", error);
        if (alive) setLongDescs({ factionId, byCeleb: {} });
      });
    return () => {
      alive = false;
    };
  }, [factionId]);

  const desc = longDescs?.factionId === factionId ? longDescs.byCeleb[celeb.id] : undefined;
  const longDesc = ((isEn ? desc?.en : desc?.ko) ?? "").trim();
  /* 「인물 안내」 본문은 안내 원문을 우선한다 — 낭독 음원(reading.mp3)이 읽는 텍스트라
     음성·문장 강조가 어긋나지 않는다. 안내가 없을 때만 약력이 모달을 채운다.
     테마별 긴 소개는 인물 수준이 아니라 테마 맥락 글이라 안내 모달에 섞지 않는다 */
  const guideText = guide?.text?.trim() || ((isEn ? celeb.bio_en || celeb.bio : celeb.bio) ?? "").trim();
  const guideAudioUrl = guide?.text ? getReadingVoiceUrl(celeb.id, guide.locale, celeb.voice_v ?? 0) : "";
  const monologueAudioUrl = monologue ? getVirtualMonologueVoiceUrl(celeb.id, monologue.locale, celeb.voice_v ?? 0) : "";
  const guideAudio = useAudioAvailable(guideAudioUrl);
  const monologueAudio = useAudioAvailable(monologueAudioUrl);

  const content = (
    <>
      <article className={layout.article}>

        <FactionPersonHeader
          person={{ id: celeb.id, slug: celeb.slug, name, title, avatarUrl: celeb.avatar_url, reality: celeb.celeb_reality }}
          factionName={factionName} group={meta?.group} portraitUrl={portraitUrl} nested
          guide={guideText ? { onOpen: () => setGuideOpen(true), hasAudio: guideAudio } : undefined}
          monologue={monologue ? { onOpen: () => setMonologueOpen(true), hasAudio: monologueAudio } : undefined}
          voice={{ hasVoice: hasGreetingAudio, isVoicePlaying: isVoiceActive,
            onGreet: canGreet ? handleGreetingPlay : undefined,
            greetLabel: hasGreetingAudio ? tCeleb("playGreetingVoice") : tCeleb("dialogue_greeting") }}
        />

        {longDesc && (
          <section className={layout.body}>
            <h3 className="mb-3 text-lg font-bold text-text-primary">
              {t.rich("personInTheme", {
                theme: factionName,
                name,
                accent: (chunks) => <span className="text-accent">{chunks}</span>,
              })}
            </h3>
            <div className={layout.paragraphs}>
              {splitReadableParagraphs(longDesc).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
          </section>
        )}

        {celeb.celeb_reality !== "FICTION" && (
          <FactionPersonReviews key={`${celeb.id}:${locale}`} celebId={celeb.id} name={name} avatarUrl={celeb.avatar_url} />
        )}
        <FactionPersonBooks celebId={celeb.id} />
      </article>

      {guideOpen && guideText && (
        <NarratedGuideModal nested celebId={celeb.id} text={guideText} audioUrl={guideAudioUrl}
          readingLocale={guide?.locale ?? locale} voiceV={celeb.voice_v ?? 0} onClose={() => setGuideOpen(false)} />
      )}
      {monologueOpen && monologue && (
        <NarratedMonologueModal nested celebId={celeb.id} text={monologue.text} locale={monologue.locale} voiceV={celeb.voice_v ?? 0}
          onClose={() => setMonologueOpen(false)} />
      )}
    </>
  );
  return <Modal isOpen onClose={onClose} ariaLabel={name} size="full" animateHeight={false} frame="plain" boxClassName={layout.modal} scrollAreaClassName="[overflow-anchor:none]">{content}</Modal>;
}
